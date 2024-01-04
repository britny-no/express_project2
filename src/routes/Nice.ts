import { Module } from "../Module";
import Common from "../js/Common"


const { express, exec, jwt } = Module
const {NICE_COOKIE_KEY, NICE_MODULE_PATH, NICE_SITE_CODE, NICE_SITE_PW, NICE_RETURN_SUCCESS_URL, NICE_RETURN_ERROR_URL} = process.env
const {MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, NICE_COOKIE_MAXAGE, NICE_JWT_SECRET, LOGIN_CACHE_KEY } = process.env

const sSiteCode = NICE_SITE_CODE;
const sSitePW = NICE_SITE_PW;
const sModulePath = NICE_MODULE_PATH;
const sAuthType = "";      	  //없으면 기본 선택화면, M(휴대폰), X(인증서공통), U(공동인증서), F(금융인증서), S(PASS인증서), C(신용카드)
const sCustomize 	= "";			  //없으면 기본 웹페이지 / Mobile : 모바일페이지
const sReturnUrl = NICE_RETURN_SUCCESS_URL;	// 성공시 이동될 URL (방식 : 프로토콜을 포함한 절대 주소)
const sErrorUrl = NICE_RETURN_ERROR_URL;	  	// 실패시 이동될 URL (방식 : 프로토콜을 포함한 절대 주소)
const deployStatus = MODE === 'DEPLOY'

const NiceRoute = express.Router();

const GetValue = (plaindata: string , key: string) => {
    let arrData = plaindata.split(":");
    let value = "";
    // for(i in arrData){
    for(let i = 0, len = arrData.length; i < len; i++){
      let item = arrData[i];
      if(item.indexOf(key) == 0)
      {
        let valLen = parseInt(item.replace(key, ""));
        arrData[i++];
        value = arrData[i].substr(0 ,valLen);
        break;
      }
    }
    return value;
  }

NiceRoute.post("/get_encode_data", (req: any, res: any) => {
    const queryStatus = Common.checkParameter(req.body, [])
    if(queryStatus){
        const d = new Date();
        const sCPRequest = sSiteCode + "_" + d.getTime();
    
        //전달 원문 데이터 초기화
        let sPlaincData = "";
        //전달 암호화 데이터 초기화
        let sEncData = "";
        //처리 결과 메시지
        let sRtnMSG = "";
    
        sPlaincData = "7:REQ_SEQ" + sCPRequest.length + ":" + sCPRequest +
                    "8:SITECODE" + sSiteCode?.length + ":" + sSiteCode +
                    "9:AUTH_TYPE" + sAuthType.length + ":" + sAuthType +
                    "7:RTN_URL" + sReturnUrl?.length + ":" + sReturnUrl +
                    "7:ERR_URL" + sErrorUrl?.length + ":" + sErrorUrl +
                    "9:CUSTOMIZE" + sCustomize.length + ":" + sCustomize;
    
        const cmd = sModulePath + " " + "ENC" + " " + sSiteCode + " " + sSitePW + " " + sPlaincData;
        const child = exec(cmd , {encoding: "euc-kr"});
    
        child.stdout.on("data", function(data: string) {
            sEncData += data;
        });
        child.on("close", function() {
            switch(sEncData){
                case '-1':
                    // sRtnMSG = "암/복호화 시스템 오류입니다.";
                case '-2':
                    // sRtnMSG = "암호화 처리 오류입니다.";
                case '-3':
                    // sRtnMSG = "암호화 데이터 오류 입니다.";
                case '-9':
                    // sRtnMSG = "입력값 오류 : 암호화 처리시, 필요한 파라미터 값을 확인해 주시기 바랍니다.";
                    res.status(400).json({errcode: -1, msg: '에러 발생'})
                    break;
                default:
                    res.json({errcode: 0, msg: sEncData})
                    break;
            }
        });
    }else{
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
})

NiceRoute.post("/checkplus-success", function(req: any, res: any) {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['EncodeData'])
    const sEncData = body.EncodeData
    const filterArr = [
        queryStatus,
        /^0-9a-zA-Z+\/=/.test(sEncData) !== true,
        sEncData != ""
    ]
    const errIndex = filterArr.indexOf(false)
    if(errIndex === -1){
        const cookieOptions = deployStatus ? {
            secure: COOKIE_SECURE,
            httpOnly: COOKIE_HTTP_ONLY,
            maxAge: NICE_COOKIE_MAXAGE
          } : {
            // httpOnly: COOKIE_HTTP_ONLY,
            sameSite: "none",
            secure: COOKIE_SECURE,
            maxAge: NICE_COOKIE_MAXAGE
          }
        const cmd = sModulePath + " " + "DEC" + " " + sSiteCode + " " + sSitePW + " " + sEncData;

        let sDecData = "";
        let sRtnMSG = "";
      
        let requestnumber = "";     //CP요청 번호 , main에서 생성한 값을 되돌려준다. 세션등에서 비교 가능
        let responsenumber = "";         //고유 번호 , 나이스에서 생성한 값을 되돌려준다.
        let authtype = "";           //인증수단
        let name = "";               //이름
        let birthdate = "";            //생년월일(YYYYMMDD)
        let gender = "";                 //성별
        let nationalinfo = "";      //내.외국인정보
        let dupinfo = "";                  //중복가입값(64byte)
        let conninfo = "";                   //연계정보 확인값(88byte)
        let mobileno = "";            //휴대폰번호(계약된 경우)
        let mobileco = "";             //통신사(계약된 경우)

        const child = exec(cmd , {encoding: "euc-kr"});
        child.stdout.on("data", function(data: string) {
        sDecData += data;
        });
        child.on("close", function() {
        //처리 결과 확인
        switch(sDecData){
            case '-1':
                sRtnMSG = "암/복호화 시스템 오류";
                break;
            case '-4':
                sRtnMSG = "복호화 처리 오류";
                break;
            case '-5':
                sRtnMSG = "HASH값 불일치 - 복호화 데이터는 리턴됨";
                break
            case '-6':
                sRtnMSG = "복호화 데이터 오류";
                break;
            case '-9':
                sRtnMSG = "입력값 오류";
                break;
            case '-12':
                sRtnMSG = "사이트 비밀번호 오류";
                break;
            default:
                //항목의 설명은 개발 가이드를 참조
                requestnumber = decodeURIComponent(GetValue(sDecData , "REQ_SEQ"));     //CP요청 번호 , main에서 생성한 값을 되돌려준다. 세션등에서 비교 가능
                responsenumber = decodeURIComponent(GetValue(sDecData , "RES_SEQ"));    //고유 번호 , 나이스에서 생성한 값을 되돌려준다.
                authtype = decodeURIComponent(GetValue(sDecData , "AUTH_TYPE"));        //인증수단
                name = decodeURIComponent(GetValue(sDecData , "UTF8_NAME"));            //이름
                birthdate = decodeURIComponent(GetValue(sDecData , "BIRTHDATE"));       //생년월일(YYYYMMDD)
                gender = decodeURIComponent(GetValue(sDecData , "GENDER"));             //성별
                nationalinfo = decodeURIComponent(GetValue(sDecData , "NATIONALINFO")); //내.외국인정보
                dupinfo = decodeURIComponent(GetValue(sDecData , "DI"));                //중복가입값(64byte)
                conninfo = decodeURIComponent(GetValue(sDecData , "CI"));               //연계정보 확인값(88byte)
                mobileno = decodeURIComponent(GetValue(sDecData , "MOBILE_NO"));        //휴대폰번호(계약된 경우)
                mobileco = decodeURIComponent(GetValue(sDecData , "MOBILE_CO"));        //통신사(계약된 경우)
                break;
        }
        const jwtResult = jwt.sign({
            verify: true,
            phone: mobileno,
            birth: birthdate,
            name: name,
            di: dupinfo,
            sex: gender
        }, NICE_JWT_SECRET, { expiresIn: '3m' });
        res.cookie(NICE_COOKIE_KEY, Common.bidirectionalEncrypted(jwtResult), cookieOptions);
        res.json({errcode: 0, msg: {sRtnMSG , requestnumber , responsenumber , authtype , name , birthdate , gender , nationalinfo , dupinfo , conninfo , mobileno , mobileco}})
        });
      
    }else{
        res.status(400).json({errcode: -1, msg: '잘못된 요청입니다'})
    }
  });

  NiceRoute.post("/checkplus-fail", function(req: any, res: any) {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['EncodeData'])
    const sEncData = body.EncodeData
    const filterArr = [
        queryStatus,
        /^0-9a-zA-Z+\/=/.test(sEncData) !== true,
        sEncData != ""
    ]
    const errIndex = filterArr.indexOf(false)
    if(errIndex === -1){
        let cmd = sModulePath + " " + "DEC" + " " + sSiteCode + " " + sSitePW + " " + sEncData;
        let sDecData = "";
        let sRtnMSG = "";
      
        let requestnumber = "";     //CP요청 번호 , main에서 생성한 값을 되돌려준다. 세션등에서 비교 가능
        let authtype = "";        //인증수단
        let errcode = "";  

        const child = exec(cmd , {encoding: "euc-kr"});
        child.stdout.on("data", function(data: string) {
          sDecData += data;
        });
        child.on("close", function() {
          //처리 결과 확인
          switch(sDecData){
              case '-1':
                  sRtnMSG = "암/복호화 시스템 오류";
                  break;
              case '-4':
                  sRtnMSG = "복호화 처리 오류";
                  break;
              case '-5':
                  sRtnMSG = "HASH값 불일치 - 복호화 데이터는 리턴됨";
                  break
              case '-6':
                  sRtnMSG = "복호화 데이터 오류";
                  break;
              case '-9':
                  sRtnMSG = "입력값 오류";
                  break;
              case '-12':
                  sRtnMSG = "사이트 비밀번호 오류";
                  break;
              default:
                  //항목의 설명은 개발 가이드를 참조
                  requestnumber = decodeURIComponent(GetValue(sDecData , "REQ_SEQ"));     //CP요청 번호 , main에서 생성한 값을 되돌려준다. 세션등에서 비교 가능
                  authtype = decodeURIComponent(GetValue(sDecData , "AUTH_TYPE"));        //인증수단
                  errcode = decodeURIComponent(GetValue(sDecData , "ERR_CODE"));          //본인인증 실패 코드
                  break;
          }
          res.json({errcode: 0, msg: {sRtnMSG , requestnumber , authtype , errcode}})
        });
      
    }else{
        res.status(400).json({errcode: -1, msg: '잘못된 요청입니다'})
    }
  });

export default NiceRoute