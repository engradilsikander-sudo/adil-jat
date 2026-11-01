// @vitest-environment jsdom
import { afterEach,expect,it } from 'vitest'
import { localizedProgramLabel } from './program-status-i18n'
afterEach(()=>{localStorage.clear();document.documentElement.lang='en'})
it('does not read an unhydrated browser preference while rendering server-matched labels',()=>{
  document.documentElement.lang='en';localStorage.setItem('jas_language','ur')
  const labels={en:'Submitted',ur:'جمع شدہ',sd:'جمع ٿيل'}
  expect(localizedProgramLabel(labels,'Submitted')).toBe('Submitted')
  expect(localizedProgramLabel(labels,'Submitted','ur')).toBe('جمع شدہ')
  expect(localizedProgramLabel(labels,'Submitted','sd')).toBe('جمع ٿيل')
  document.documentElement.lang='ur'
  expect(localizedProgramLabel(labels,'Submitted')).toBe('جمع شدہ')
})
