// @vitest-environment jsdom
import { act,cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach,expect,it,vi } from 'vitest'
import { I18nProvider,useI18n } from './index'
function Probe(){const {language,setLanguage}=useI18n();return <><span>{language}</span><button onClick={()=>setLanguage('ur')}>Urdu</button></>}
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks()})
it('hydrates English markup before applying a saved RTL preference',async()=>{
  localStorage.setItem('jas_language','ur')
  const element=<I18nProvider><Probe/></I18nProvider>
  const container=document.createElement('div');container.innerHTML=renderToString(element);document.body.appendChild(container)
  expect(container.textContent).toContain('en')
  const errors:unknown[]=[]
  let root:ReturnType<typeof hydrateRoot>
  await act(async()=>{root=hydrateRoot(container,element,{onRecoverableError:error=>errors.push(error)})})
  await waitFor(()=>expect(container.querySelector('span')?.textContent).toBe('ur'))
  expect(errors).toEqual([])
  await act(async()=>root!.unmount());container.remove()
})
it('can switch language even when browser storage is blocked',()=>{
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('Storage blocked')})
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Storage blocked')})
  render(<I18nProvider><Probe/></I18nProvider>)
  fireEvent.click(screen.getByRole('button',{name:'Urdu'}))
  expect(screen.getByText('ur')).toBeTruthy()
})
