// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { focusInvalidRegistrationField, focusRegistrationStep } from './register-step-focus'
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals()})
it.each([true,false])('focuses below sticky header with reduced motion %s',reduce=>{
 document.body.innerHTML='<header class="jas-header"></header><div id="step"><h2>New step</h2><input /></div>'
 const heading=document.querySelector('h2')!;const scroll=vi.fn();heading.scrollIntoView=scroll
 vi.spyOn(document.querySelector('header')!,'getBoundingClientRect').mockReturnValue({height:96} as DOMRect)
 vi.stubGlobal('matchMedia',()=>({matches:reduce}))
 expect(focusRegistrationStep(document.getElementById('step')!)).toBe(true)
 expect(document.activeElement).toBe(heading);expect(heading.style.scrollMarginTop).toBe('112px')
 expect(scroll).toHaveBeenCalledWith({block:'start',behavior:reduce?'instant':'smooth'})
})
it('focuses a rendered invalid field without announcing the heading first',()=>{
 document.body.innerHTML='<header class="jas-header"></header><div id="step"><h2>Location</h2><input id="district" aria-invalid="true" /></div>'
 const input=document.getElementById('district')!;const scroll=vi.fn();input.scrollIntoView=scroll
 vi.spyOn(document.querySelector('header')!,'getBoundingClientRect').mockReturnValue({height:72} as DOMRect)
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 expect(focusInvalidRegistrationField(document.getElementById('step')!)).toBe(true)
 expect(document.activeElement).toBe(input);expect(input.style.scrollMarginTop).toBe('88px')
 expect(scroll).toHaveBeenCalledWith({block:'center',behavior:'smooth'})
})
it('does not steal focus when the requested target is absent',()=>{
 document.body.innerHTML='<input id="focused"><div id="step"></div>'
 const input=document.getElementById('focused')!;input.focus()
 expect(focusRegistrationStep(document.getElementById('step')!)).toBe(false)
 expect(focusInvalidRegistrationField(document.getElementById('step')!)).toBe(false)
 expect(document.activeElement).toBe(input)
})
