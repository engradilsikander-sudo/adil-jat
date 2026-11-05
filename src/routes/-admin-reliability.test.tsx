vi.mock('../lib/use-finance-access', () => ({ useFinanceAccess: () => ({ checking: false, allowed: true, userId: 'test-admin', revision: 0 }) }))
// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest'
import { cleanup,render,screen,fireEvent } from '@testing-library/react'
import type { ComponentType,ReactNode } from 'react'
const state=vi.hoisted(()=>({path:'/admin/programs/health',fail:true}))
vi.mock('@tanstack/react-router',()=>({
  createFileRoute:()=> (options:unknown)=>options,
  useRouterState:({select}:{select:(x:unknown)=>unknown})=>select({location:{pathname:state.path}}),
  useNavigate:()=>vi.fn(),
  Link:({children}:{children:ReactNode})=><a>{children}</a>, Outlet:()=>null,
}))
vi.mock('../components/admin/AdminShell',()=>({AdminShell:({children}:{children:ReactNode})=><main>{children}</main>}))
vi.mock('../lib/area-permissions',()=>({
  loadCurrentAdminAreaAccess:async()=>({ok:true,isGlobalAdmin:true}),
  filterRowsByAreaAccess:(rows:unknown[])=>rows,getAreaAccessSummaryText:()=>'',
}))
vi.mock('../lib/supabase/client',()=>({supabase:{
  auth:{getUser:async()=>({data:{user:{id:'test-admin'}},error:null})},
  from:(table:string)=>{
    const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,range:()=>q,limit:()=>q,returns:()=>q,
      then:(resolve:(v:unknown)=>unknown)=>Promise.resolve(resolve(table==='user_roles' ? {data:[{role:'super_admin'}],error:null} : {data:state.fail?null:[],error:state.fail?{code:'42501',message:'permission denied for table program_applications'}:null,count:state.fail?null:0}))}
    return q
  },
}}))
vi.mock('../lib/cms',async importOriginal=>({...(await importOriginal<Record<string,unknown>>()),
  currentUserCanManageCms:async()=>true,
  fetchAllCmsPagesForAdmin:async()=>{throw {code:'42501',message:'permission denied for table cms_pages'}},
}))
vi.mock('../lib/committees',async importOriginal=>({...(await importOriginal<Record<string,unknown>>()),
  currentUserCanManageCommittees:async()=>true,
  fetchCommitteesForAdmin:async()=>{throw {code:'42501',message:'permission denied for table organization_committees'}},
  fetchDesignations:async()=>{throw {code:'42501',message:'permission denied for table organization_designations'}},
}))
import { Route as Finance } from './admin/finance'
import { Route as Committees } from './admin/committees'
import { Route as Designations } from './admin/designations'
import { I18nProvider } from '../lib/i18n'
import { Route as Health } from './admin/programs/health'
import { Route as Education } from './admin/programs/education'
import { Route as Welfare } from './admin/programs/welfare'
import { Route as Employment } from './admin/programs/employment'
import { Route as CMS } from './admin/cms'
afterEach(cleanup)
for(const [module,route,count] of [['health',Health,7],['education',Education,6],['welfare',Welfare,7],['employment',Employment,5]] as const){
  it(`${module} shows unavailable statistics after a denied read, then recovers on retry`,async()=>{
    state.path=`/admin/programs/${module}`;state.fail=true
    const Page=(route as unknown as {component:ComponentType}).component
    render(<I18nProvider><Page/></I18nProvider>)
    await screen.findByText(/Ask an administrator to check database permissions/)
    expect(screen.getAllByText('—')).toHaveLength(count)
    expect(screen.queryByText('0')).toBeNull()
    state.fail=false
    const buttons=screen.queryAllByRole('button',{name:'Try again'})
    fireEvent.click(buttons[0] ?? screen.getByRole('button',{name:/Refresh/i}))
    await screen.findAllByText('0')
    expect(screen.queryByText(/Ask an administrator/)).toBeNull()
  })
}
it('CMS does not call inaccessible translations MISSING or show edit controls',async()=>{
  state.path='/admin/cms'
  const Page=(CMS as unknown as {component:ComponentType}).component
  render(<I18nProvider><Page/></I18nProvider>)
  await screen.findByRole('alert')
  expect(screen.queryByText('MISSING')).toBeNull()
  expect(screen.queryByRole('button',{name:'Edit'})).toBeNull()
  expect(screen.queryByText('0')).toBeNull()
})

for(const [module,route] of [['finance',Finance],['committees',Committees],['designations',Designations]] as const){
  it(`${module} hides inaccessible records and offers retry after a failed load`,async()=>{
    state.path=`/admin/${module}`;state.fail=true
    const Page=(route as unknown as {component:ComponentType}).component
    render(<I18nProvider><Page/></I18nProvider>)
    await screen.findByRole('alert')
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText(/No level units found/)).toBeNull()
    expect(screen.queryByText('GRANT SELECT')).toBeNull()
    expect(screen.getByRole('button',{name:'Try again'})).toBeTruthy()
  })
}
