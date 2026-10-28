/** Leave room for mailbox/status bindings below D1's per-query parameter cap. */
export async function loadInBatches<T, R>(items: readonly T[], load: (batch: T[]) => Promise<R[]>, size = 40): Promise<R[]> {
 const rows: R[]=[];
 for(let offset=0;offset<items.length;offset+=size) rows.push(...await load(items.slice(offset,offset+size)));
 return rows;
}
