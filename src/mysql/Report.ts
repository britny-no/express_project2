
import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from "../js/StringJs";


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env
type bodyOb = Record<string, number | string>;

type CONTRACT_BODY = bodyOb & {
    price: number
    purpose: string
}

type CONTRACTER_OB = bodyOb & {
    contrater_info: []
} 

type CONTRACTER_RESULT = Record<number | string, CONTRACTER_OB>


const getReport = (bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        table_name, construction_index, limit_date
    } = bodyOb
    const params: Array<string | number | undefined> = [
        construction_index, limit_date, limit_date
    ]

    const url = `
        select a.contract_date, a.purpose, a.dong, a.status, a.parcel_area, a.origin_price, b.parcel_price  from (select * from CONTRACT_${table_name} where construction_index = ? and (( date_format( contract_date, '%Y-%m-%d')  < date_format( ?, '%Y-%m-%d')) or ( date_format( ?, '%Y-%m-%d')  = date_format(contract_date, '%Y-%m-%d')) or contract_date is null )) as a left join PARCEL_${table_name} as b on a.contract_index = b.contract_index
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    resolve(rows)
                } catch (error: any) {
                    if (error.sqlMessage.includes("doesn't exist")) {
                        reject([400, '잘못된 정보입니다'])
                    } else {
                        Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/report/getReport , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                        reject([500, '관리자에게 문의바랍니다']);
                    }
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

const getReportForChart = (bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        table_name, construction_index, limit_date
    } = bodyOb
    const params: Array<string | number | undefined> = [
        construction_index, limit_date, limit_date, construction_index
    ]

    const url = `
        select a.contract_date, a.purpose, a.dong, a.status, a.parcel_area, a.origin_price, b.parcel_price  from (select * from CONTRACT_${table_name} where construction_index = ? and status = 3  and (( date_format( contract_date, '%Y-%m-%d')  < date_format(?, '%Y-%m-%d')) or ( date_format( ?, '%Y-%m-%d')  = date_format(contract_date, '%Y-%m-%d')) or contract_date is null )) as a left join PARCEL_${table_name} as b on a.contract_index = b.contract_index order by contract_date asc;
        SELECT purpose FROM CONTRACT_${table_name} where construction_index = ? group by purpose;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]
                    resolve(rows)
                } catch (error: any) {
                    if (error.sqlMessage.includes("doesn't exist")) {
                        reject([400, '잘못된 정보입니다'])
                    } else {
                        Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/report/getReportForChart , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                        reject([500, '관리자에게 문의바랍니다']);
                    }
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

const getCashFlow = (bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        table_name, construction_index, limit_date
    } = bodyOb
    const params: Array<string | number | undefined> = [
        construction_index, limit_date, limit_date, construction_index
    ]

    //getReportForChart과 동일한 출력 위해 date -> contract_date, payment -> parcel_price
    const url = `
        select 
            a.purpose, a.dong, a.status, a.parcel_area, a.origin_price, b.date as contract_date, b.payment  as parcel_price
        from (select * from CONTRACT_${table_name} where construction_index = ? ) as a inner join PAY_${table_name} as b on a.contract_index = b.contract_index and (( date_format( b.date, '%Y-%m-%d')  < date_format( ?, '%Y-%m-%d')) or ( date_format( ?, '%Y-%m-%d')  = date_format(b.date, '%Y-%m-%d'))) order by b.date;
        SELECT purpose FROM CONTRACT_${table_name} where construction_index = ? group by purpose;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    resolve(rows)
                } catch (error: any) {
                    if (error.sqlMessage.includes("doesn't exist")) {
                        reject([400, '잘못된 정보입니다'])
                    } else {
                        Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/report/getCashFlow , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                        reject([500, '관리자에게 문의바랍니다']);
                    }
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
    getReport,
    getReportForChart,
    getCashFlow
};
export default Mysql