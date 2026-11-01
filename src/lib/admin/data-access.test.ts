import { describe,it,expect } from 'vitest'
import { fetchAllRows,adminErrorMessage } from './data-access'

describe('complete admin datasets',()=>{
  it('retrieves all 1251 rows even when the API returns fewer rows than requested',async()=>{
    const rows=Array.from({length:1251},(_,id)=>({id}))
    const result=await fetchAllRows(async (from,to)=>({data:rows.slice(from,Math.min(to+1,from+73)),error:null,count:rows.length}))
    expect(result.error).toBeNull();expect(result.data).toEqual(rows)
  })
  it('discards partial results if a later page is denied',async()=>{
    const result=await fetchAllRows(async from => from===0 ? {data:[1,2],error:null,count:3} : {data:null,error:{code:'42501',message:'permission denied'},count:null})
    expect(result.data).toEqual([]);expect(result.error?.code).toBe('42501')
  })
  it('rejects a changing count instead of silently reporting incomplete totals',async()=>{
    const result=await fetchAllRows(async from=>({data:[from],error:null,count:from===0 ? 2 : 3}))
    expect(result.error?.message).toContain('Records changed')
  })
  it('rejects a missing count and an empty page before completion',async()=>{
    expect((await fetchAllRows(async()=>({data:[1],error:null,count:null}))).error).not.toBeNull()
    expect((await fetchAllRows(async()=>({data:[],error:null,count:2}))).error).not.toBeNull()
  })
  it('distinguishes a successful empty result from a transport failure',async()=>{
    expect(await fetchAllRows(async()=>({data:[],error:null,count:0}))).toEqual({data:[],error:null})
    expect((await fetchAllRows(async()=>{throw new Error('Connection interrupted')})).error?.message).toContain('Connection')
  })
})
it('normalizes plain PostgREST errors without displaying SQL or object names',()=>{
  const message=adminErrorMessage({code:'42501',message:'permission denied for table program_applications',hint:'GRANT ALL ON ...'})
  expect(message).toContain('database permissions');expect(message).not.toContain('program_applications');expect(message).not.toContain('GRANT')
  expect(adminErrorMessage({message:'Connection interrupted'})).toBe('Connection interrupted')
})
