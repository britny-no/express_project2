import { Module } from "../Module";

const { seoulMoment} = Module

type CONTRACT_BODY = {
    status: number, contract_date : string, parcel_price: number, origin_price: number, parcel_area: number, purpose: string, dong:number
}


// - 계약 체결 건수(전일/금일/누적)
// - 전체 분양률(공급가액/분양면적/호실)
// - 용도별 분양률
// - 동별 분양률
// - 층별 분양률
// - 분양률은(체결된 실공급가액/총 실공급가액)
// - 계약이라는 행위를 했지만, 실공급가액은 예정된 금액으로 있다가 할인해서 계약시 변경해주는 개념
// - 미분양시 실공급가액은 원공급가액과 동일해서 origin_price로 설정
const manufactureReport = (data: CONTRACT_BODY[], limit_date: Date) => {
    const conclusionOb = {
        preContract: 0, todayContract: 0, totalContract: 0, 
        preContractPrice: 0, todayContractPrice: 0, totalContractPrice: 0, 
    }
    const parcelOb = {
        parcelPrice: 0, totalPrice: 0, 
        parcelArea: 0, totalArea:0,
        parcelHosil: 0, totalHosil:0
    }
    
    let purposeOb: Record<string, Record<string, number>> = {}
    let dongOb: Record<string, Record<string, number>> = {}

    // if문 반복 피하기 위해 한번더 루프
    data.forEach((v: CONTRACT_BODY) => {{
        const { purpose, dong } = v
        purposeOb = {
            ...purposeOb,
            [purpose]: {
                purposeParcelPrice:  0,
                purposeParcelCount:  0, 
                purposeTotalPrice:  0, 
                purposeTotalCount:  0,
            }
        }
        dongOb = {
            ...dongOb,
            [dong]: {
                dongPracelPrice:  0,
                dongParcelCount:  0,
                dongTotalPrice:   0,
                dongTotalCount:   0,
            }
        }

    }})

    data.forEach((v: CONTRACT_BODY) => {
        const {contract_date, purpose, dong, status } = v
        const  parcel_price = Number(v.parcel_price || 0)
        const  origin_price = Number(v.origin_price || 0)
        const  price = parcel_price ? parcel_price : origin_price
        const  parcel_area = Number(v.parcel_area || 0)

        const {purposeParcelPrice, purposeTotalPrice, purposeParcelCount, purposeTotalCount} = purposeOb[purpose]
        const {dongPracelPrice, dongTotalPrice, dongParcelCount, dongTotalCount} = dongOb[dong]

        // 분양
        if(status === 3){
            // 계약 체결 건수(전일/금일/누적)
            // 금일
            if(seoulMoment(limit_date).isSame(seoulMoment(contract_date, "YYYY-MM-DD"), 'day')){
                conclusionOb.todayContract += 1
                conclusionOb.todayContractPrice += price
            }
            // 전일
            if(seoulMoment(limit_date).subtract(1, 'day').isSame(seoulMoment(contract_date, "YYYY-MM-DD"), 'day')){
                conclusionOb.preContract += 1
                conclusionOb.preContractPrice += price
            }
            // 누적
            conclusionOb.totalContract += 1
            conclusionOb.totalContractPrice += price
            
            parcelOb.parcelPrice += price
            parcelOb.parcelArea += parcel_area
            parcelOb.parcelHosil += 1   
            
            purposeOb[purpose] = {
                ...purposeOb[purpose],
                purposeParcelPrice:  purposeParcelPrice + price, 
                purposeParcelCount:  purposeParcelCount  + 1, 
            }
            dongOb[dong] = {
                ...dongOb[dong],
                dongPracelPrice:  dongPracelPrice + price, 
                dongParcelCount:  dongParcelCount + 1, 
            }

        }

        //전체
        parcelOb.totalPrice += price
        parcelOb.totalArea += parcel_area
        parcelOb.totalHosil += 1

        purposeOb[purpose] = {
            ...purposeOb[purpose],
            purposeTotalPrice:  purposeTotalPrice + price, 
            purposeTotalCount:  purposeTotalCount + 1,
        }
        dongOb[dong] = {
            ...dongOb[dong],
            dongTotalPrice:  dongTotalPrice + price, 
            dongTotalCount:  dongTotalCount + 1,
        }
    })

    return {
        conclusionOb, parcelOb, purposeOb, dongOb
    }
}

// daily 정보만 다룬다
// 분양되었으면 sale_price는 0이 아님
const manufactureChartReport = (data: CONTRACT_BODY[], uniqueTotalPurpose: Array<string>) => {
    let chartOb: Record<string, Record<string, Record<string, number>>> = {}
    //전체 용도에 대한 객체값 생성  
    const uniqueTotalOb: Record<string, Record<string, number>> = uniqueTotalPurpose.reduce((acc, curr) => {
        acc = {
            ...acc,
            [curr] : {
                purposeTotalPrice: 0,
                purposeTotalCount: 0
            }
        }
        return acc
    }, {})

    // if문 방지 위해 
    // lb로 cpu 관리하니, 메모리 이슈에 민감해야할듯. 향수 if문 사용으로 수정
    data.forEach((v: CONTRACT_BODY) => {
        const {contract_date, purpose } = v
        const date = seoulMoment(contract_date).format('YYYY-MM-DD')

        chartOb = {
            ...chartOb,
            [date]: uniqueTotalOb
        }
    })


    data.forEach((v: CONTRACT_BODY) => {
        const {contract_date, purpose } = v
        const date = seoulMoment(contract_date).format('YYYY-MM-DD')
        const sale_price = Number(v.parcel_price || 0)
        const preOb = chartOb[date][purpose]

        chartOb = {
            ...chartOb,
            [date]:{
                ...chartOb[date],
                [purpose]: {
                    purposeTotalPrice: preOb['purposeTotalPrice'] + sale_price,
                    purposeTotalCount: preOb['purposeTotalCount'] + 1,
                }
            }
        }
    })
    return {
        chartOb, purposeArr :  uniqueTotalPurpose
    }
}

const manufactureDongSummary = (data: CONTRACT_BODY[], uniqueTotalPurpose: Array<string>) => {
    let dongOb: Record<string, Record<string, number>> = {}
    //전체 용도에 대한 객체값 생성  
    const uniqueTotalOb: Record<string, Record<string, number>> = uniqueTotalPurpose.reduce((acc, curr) => {
        acc = {
            ...acc,
            [curr] : 0 
        }
        return acc
    }, {})

    // if문 방지 위해 
    // lb로 cpu 관리하니, 메모리 이슈에 민감해야할듯. 향수 if문 사용으로 수정
    data.forEach((v: CONTRACT_BODY) => {
        dongOb = {
            ...dongOb,
            [v.dong]: uniqueTotalOb
        }
    })


    data.forEach((v: CONTRACT_BODY) => {
        const {purpose, dong } = v

        dongOb = {
            ...dongOb,
            [dong]:{
                ...dongOb[dong],
                [purpose]: dongOb[dong][purpose] + 1
            }
        }
    })
    return {
        dongOb, purposeArr :  uniqueTotalPurpose
    }
}

// const manufactureCashFlow = (data: { date: string, payment: number}[]) => {
//     let chartOb: Record<string, number> = {}


//     // if문 방지 위해 
//     // lb로 cpu 관리하니, 메모리 이슈에 민감해야할듯. 향수 if문 사용으로 수정
//     data.forEach((v: { date: string, payment: number}) => {
//         const date = seoulMoment(v.date).format('YYYY-MM-DD')

//         chartOb = {
//             ...chartOb,
//             [date]: (chartOb[date] || 0) + Number(v.payment)
//         }
//     })

//     return {
//         chartOb
//     }
// }

const ReportJs: Record<string, Function> = {
    manufactureReport,
    manufactureChartReport,
    manufactureDongSummary,
    // manufactureCashFlow
};

export default ReportJs
