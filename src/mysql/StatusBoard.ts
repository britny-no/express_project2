import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from "../js/StringJs";


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env

type bodyOb = Record<string, number | string>;

const getLayerlist = (table_name: string, bodyOb: bodyOb) => new Promise<any>(async (resolve, reject) => {
    const {
        member_index, construction_index, dong
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, dong
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select contract_index, layer, status, hosil from CONTRACT_${table_name} where construction_index = ? and dong = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    let ob: any = {}
                    rows = rows[0]

                    rows[1].forEach((v: {layer: number, status: number, contract_index: number, hosil: number}) => {
                        const { layer, status, contract_index, hosil } = v
                        if(ob[layer]){
                            const { totalCount, parcelCount, contract_index_list} = ob[layer]
                            ob = {
                                ...ob,
                                [layer]: {
                                    totalCount: totalCount+1,
                                    parcelCount: [3, 4].includes(status) ? parcelCount+1 : parcelCount,
                                    contract_index_list: [...contract_index_list, [contract_index, hosil, status]]
                                }
                            }

                        }else{
                            ob = {
                                ...ob,
                                [layer]: {
                                    totalCount: 1,
                                    parcelCount: [3, 4].includes(status) ? 1 : 0,
                                    contract_index_list: [[contract_index, hosil, status]]
                                }
                            }
                        }
                    })



                    rows[0][0] ? resolve(Object.keys(ob).map(v => {
                        return {
                            layer: v,
                            ...ob[v]
                        }
                    })) : reject([403, '권한이 없습니다'])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/status_board/getLayerlist , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([400, '조회 실패'])
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const getParcelListByLayer = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        member_index, construction_index, contract_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, contract_index
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select  
            a.contract_index, a.construction_index, a.status, a.contract_type, a.dong, a.hosil, a.layer, a.origin_price, a.private_area, a.public_area, a.parcel_area, a.dedicated_rate, a.large_stake, a.building_proportions, a.purpose,
            b.parcel_index, b.sale_price, b.discount_payment, b.discount_ratio, b.av_price, b.land_cost, b.building_cost, b.parcel_price, b.vat, b.sale_price
        from (select contract_index, construction_index, status, contract_type, dong, hosil, layer, origin_price, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, purpose from CONTRACT_${table_name} where construction_index = ? and contract_index = ?) as a left join  PARCEL_${table_name} as b on a.contract_index = b.contract_index order by a.layer;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, '권한이 없습니다'])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/status_board/getParcelListByLayer , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([400, '조회 실패'])
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})



const Mysql: Record<string, Function> = {
    getLayerlist,
    getParcelListByLayer
};
export default Mysql