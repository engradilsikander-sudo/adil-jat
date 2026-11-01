import { test,expect } from '@playwright/test'
test.use({ serviceWorkers:'block' })
for(const language of ['en','ur','sd']) {
for(const width of [360,390,768,1024,1280,1440]) {
  for(const module of ['education','health','welfare','employment']) {
    test(`${module} controls fit at ${width}px in ${language} with synthetic admin responses`,async({page,baseURL})=>{
      test.skip(!['127.0.0.1','localhost'].includes(new URL(baseURL!).hostname),'Synthetic authentication fixtures are local-only')
      await page.setViewportSize({width,height:1000})
      const uid='b2000000-0000-4000-8000-000000000003'
      const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-only-signature'].join('.')
      await page.addInitScript(({uid,token,language})=>{localStorage.setItem('jas_language',language);localStorage.setItem('jas-app-auth',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:uid,email:'fixture@example.invalid'}}))},{uid,token,language})
      const fixture=async(route:import('@playwright/test').Route)=>{
        const path=new URL(route.request().url()).pathname
        const headers:Record<string,string>={'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-range':'*/0'}
        if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return}
        let body:unknown=[]
        if(path==='/auth/v1/user')body={id:uid,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'}
        else if(path.includes('/rpc/'))body=true
        else if(path.includes('user_roles')){body=[{role:'super_admin'}];headers['content-range']='0-0/1'}
        await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)})
      }
      await page.route('**/auth/v1/**',fixture)
      await page.route('**/rest/v1/**',fixture)
      const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
      await page.goto(`/admin/programs/${module}`)
      await expect(page.locator('html')).toHaveAttribute('lang',language)
      await expect(page.locator('.admin-filter-grid')).toBeVisible()
      const result=await page.locator('.admin-filter-grid').evaluate(grid=>{
        const box=grid.getBoundingClientRect()
        const controls=[...grid.querySelectorAll('input,select,button')]
        return {count:controls.length,bad:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<70||r.left<box.left-1||r.right>box.right+1}).map(el=>el.tagName),overflow:document.documentElement.scrollWidth>innerWidth+1}
      })
      expect(result.count).toBeGreaterThan(3);expect(result.bad).toEqual([]);expect(result.overflow).toBe(false);expect(errors).toEqual([])
    })
  }
}
}
