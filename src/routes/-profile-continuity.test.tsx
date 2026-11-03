// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'
const state = vi.hoisted(() => ({ blocker: null as null | { enableBeforeUnload: boolean; shouldBlockFn: () => boolean }, rpcError: false, refreshError: false, submitted: false }))
vi.mock('@tanstack/react-router', () => ({createFileRoute: () => (options: unknown) => options,useNavigate: () => vi.fn(),useBlocker: (options: typeof state.blocker) => { state.blocker = options },Link: ({ children }: { children: ReactNode }) => <a>{children}</a>}))
const member = {id:'member',user_id:'user',member_no:'JAS-2026-10001',status:'approved',full_name:'Example Member',father_name:'Example Parent',cnic:'44104-1234567-1',mobile:'03001234567',district:'Umerkot',taluka:'Kunri',profession:'Teacher',caste_branch:'Example',address:'Example street',date_of_birth:'1990-01-01',gender:'Male',education:'Graduate',blood_group:'O+',emergency_contact_name:'Example Contact',emergency_contact_relation:'Brother',emergency_contact_mobile:'03111234567',photo_url:null,updated_at:'2026-01-01'}
vi.mock('../lib/supabase/client', () => ({supabase:{auth:{getUser:async()=>({data:{user:{id:'user'}},error:null})},from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:()=>q,order:()=>q,returns:async()=>({data:member,error:state.submitted&&state.refreshError?{message:'Refresh failed'}:null}),limit:async()=>({data:[],error:null})};return q},rpc:async()=>{state.submitted=true;return {error:state.rpcError?{message:'Submit failed'}:null}}}}))
import { Route } from './profile-update'
import { I18nProvider } from '../lib/i18n'
async function mount(){const Page=(Route as unknown as {component:ComponentType}).component;render(<I18nProvider><Page/></I18nProvider>);await screen.findByDisplayValue('Teacher')}
beforeEach(()=>{localStorage.clear();state.rpcError=false;state.refreshError=false;state.submitted=false;vi.spyOn(window,'confirm').mockReturnValue(false)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('protects edits, permits confirmed leave, and clears protection after reverting',async()=>{
 await mount();expect(state.blocker?.enableBeforeUnload).toBe(false)
 const input=screen.getByDisplayValue('Teacher');fireEvent.change(input,{target:{value:'Principal'}})
 expect(state.blocker?.enableBeforeUnload).toBe(true);expect(state.blocker?.shouldBlockFn()).toBe(true)
 vi.mocked(window.confirm).mockReturnValue(true);expect(state.blocker?.shouldBlockFn()).toBe(false)
 fireEvent.change(input,{target:{value:'Teacher'}});expect(state.blocker?.enableBeforeUnload).toBe(false)
})
it('labels and protects note-only edits; reset cancel preserves and confirm clears',async()=>{
 await mount();const note=screen.getByRole('textbox',{name:'Reason / note for reviewer'})
 fireEvent.change(note,{target:{value:'Please review'}});expect(state.blocker?.enableBeforeUnload).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'Reset Form'}));expect((note as HTMLTextAreaElement).value).toBe('Please review')
 vi.mocked(window.confirm).mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Reset Form'}))
 expect((note as HTMLTextAreaElement).value).toBe('');expect(state.blocker?.enableBeforeUnload).toBe(false)
})
it('protects photo-only edits and resets the file picker',async()=>{
 URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn()
 await mount();const input=screen.getByLabelText('Replace member photo (optional)') as HTMLInputElement
 fireEvent.change(input,{target:{files:[new File(['photo'],'photo.png',{type:'image/png'})]}})
 expect(state.blocker?.enableBeforeUnload).toBe(true)
 vi.mocked(window.confirm).mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Reset Form'}))
 expect(input.value).toBe('');expect(state.blocker?.enableBeforeUnload).toBe(false)
})
it('keeps failed submissions protected',async()=>{
 state.rpcError=true;await mount();fireEvent.change(screen.getByDisplayValue('Teacher'),{target:{value:'Principal'}})
 fireEvent.click(screen.getByRole('button',{name:'Submit Update Request'}))
 await screen.findByText('Submit failed');expect(state.blocker?.enableBeforeUnload).toBe(true)
 expect(screen.getByDisplayValue('Principal')).toBeTruthy()
})
it('clears protection after accepted submission even if refresh fails',async()=>{
 state.refreshError=true;await mount();fireEvent.change(screen.getByDisplayValue('Teacher'),{target:{value:'Principal'}})
 fireEvent.click(screen.getByRole('button',{name:'Submit Update Request'}))
 await screen.findByText('Refresh failed');expect(state.blocker?.enableBeforeUnload).toBe(false)
})
