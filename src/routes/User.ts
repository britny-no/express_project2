import { Module } from "../Module";

import Mysql from "../mysql/User"

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"

import { pwRegexp, emailRegexp, phoneRegexp, birthRegexp } from "../constant/RegExp"


const { express, cacheManager, jwt, crypto, seoulMoment, nodeRSA, fs, path } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, JWT_EXPIRE, LOGIN_CACHE_KEY, NICE_COOKIE_KEY } = process.env

interface JwtResult {
  data: string;
  iat: number;
  exp: number;
  loginToken: string
}

const UserRoute = express.Router();
const deployStatus = MODE === 'DEPLOY'

UserRoute.post('/sign_up', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['id', 'pw', 'email', 'phone', 'name', 'birth', 'sex'])
    const { id, email, phone, name, birth, sex } = body
    const privateKey = fs.readFileSync(path.normalize(__dirname + "/../../rsa-private.pem"), { encoding: "utf8" })
    // const passJwtOb = await Common.checkPass(req)
    const pw = Common.decryptMessage(
      body.pw,
      privateKey
    );
    const filterErr = [
      queryStatus && pw,
      // passJwtOb,
      pw && pwRegexp.test(pw),
      emailRegexp.test(email),
      // phoneRegexp.test(phone) && passJwtOb.phone === phone,
      // birthRegexp.test(birth) && passJwtOb.birth === birth.replace(/-/g, ''),
      // [1, 2].includes(sex) && Number(passJwtOb.sex) === sex,
      // passJwtOb.name === name
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      const member_index = await Mysql.signUp({ ...body, pw: pw, di: null })
      // const member_index = await Mysql.signUp({ ...body, pw: pw, di: passJwtOb.di })
      // const client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      // const loginToken = crypto.randomBytes(5).toString('hex')
      // const jwtResult = jwt.sign({
      //   loginToken,
      //   client_ip,
      //   member_index,
      //   construction_site: '',
      // }, JWT_SECRET, { expiresIn: JWT_EXPIRE }); // 20m
      // const cookieOptions = deployStatus ? {
      //   secure: COOKIE_SECURE,
      //   httpOnly: COOKIE_HTTP_ONLY,
      //   maxAge: COOKIE_MAXAGE
      // } : {
      //   // httpOnly: COOKIE_HTTP_ONLY,
      //   sameSite: "none",
      //   secure: COOKIE_SECURE,
      //   maxAge: COOKIE_MAXAGE,
      // }

      // res.cookie(await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY), Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.send({ errcode: 0, msg: "회원가입 완료" })
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        // '본인 인증을 해주세요',
        '비밀번호를 다시 적어주세요',
        '이메일을 다시 적어주세요',
        // '전화번호를 다시 적어주세요',
        // '생년월일을 다시 적어주세요',
        // '성별을 다시 선택해주세요',
        // '성함을 다시 적어주세요',
      ]
      res.status(400).json({ errnum: -1, msg: errMsg[errIndex] })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.get('/check_id', async (req: any, res: any) => {
  try {
    const queryStatus = Common.checkParameter(req.query, ['id'])

    if (queryStatus) {
      res.json({ errcode: 0, msg: await Mysql.checkId(req.query) })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.post('/login', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['id', 'pw'])
    const privateKey = fs.readFileSync(path.normalize(__dirname + "/../../rsa-private.pem"), { encoding: "utf8" })
    const pw = Common.decryptMessage(
      body.pw,
      privateKey
    );

    if (queryStatus && pw) {
      const { member_index, construction_site } = await Mysql.login({ ...body, pw: pw })
      const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      const loginToken = crypto.randomBytes(5).toString('hex')
      const jwtResult = jwt.sign({
        loginToken,
        clientIp,
        member_index,
        construction_site,
        // 토큰 갈취를 염려하면 exp 기간을 줄여야함
      }, JWT_SECRET, { expiresIn: JWT_EXPIRE }); // 20m
      const cookieOptions = deployStatus ? {
        secure: COOKIE_SECURE,
        httpOnly: COOKIE_HTTP_ONLY,
        maxAge: COOKIE_MAXAGE
      } : {
        // httpOnly: COOKIE_HTTP_ONLY,
        sameSite: "none",
        secure: COOKIE_SECURE,
        maxAge: COOKIE_MAXAGE,
      }

      res.cookie(await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY), Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.json({ errcode: 0, msg: loginToken })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' });
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})



UserRoute.get('/get_profile', async (req: any, res: any) => {
  try {
    const queryStatus = Common.checkParameter(req.query, ['loginToken'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key]), { construction_site } = jwtOb
      const profileArr = await Mysql.getProfile({
        ...jwtOb,
        construction_site,
      })
      
      const restTime = Common.returnRestTime(jwtOb)
      delete jwtOb['iat'], delete jwtOb['exp'];
      const jwtResult = jwt.sign({
        ...jwtOb,
        tableOb: Common.jwtColumnEncrypted(profileArr[1]),
        // 크루 승인등 db construction_site 변경은 로그아웃 유도해야할듯 합니다
        // construction_site 정렬 방식이 jwt만으로 진행
        // construction_site: profileArr[0][0].construction_site
      }, process.env.JWT_SECRET, { expiresIn: `${restTime}ms` });
      

      const cookieOptions = deployStatus ? {
        secure: COOKIE_SECURE,
        httpOnly: COOKIE_HTTP_ONLY,
        maxAge: restTime * 1000
      } : {
        // httpOnly: COOKIE_HTTP_ONLY,
        sameSite: "none",
        secure: COOKIE_SECURE,
        maxAge: restTime * 1000
      }
      const db_construction_site = profileArr[0][0].construction_site

      // order construction_site
      if (construction_site && db_construction_site) {
        profileArr[0][1] = construction_site.split(',').map((v: string, k: number) => {
          const index = Number(v)

          return profileArr[0][1].filter((i: { construction_index: number }) => i.construction_index === index)[0]
        })
        // set construction_site
        // token, db construction_site비교해 새로운 값 있으면 token construction_site 맨 마지막에 추가
        profileArr[0][0] = {
          ...profileArr[0][0],
          construction_site: StringJs.generateConstrucionSite(construction_site, profileArr[0][0].construction_site)
        }
      }else{
        profileArr[0][1] = []
      }


      res.cookie(key, Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.json({ errcode: 0, msg: profileArr[0] })
    } else {
      res.status(401).json({ errcode: -1, msg: '' })
    }
  } catch (err) {
    console.log(err)
    return Common.resError(res, err)
  }
})


UserRoute.post('/update_constuction', async (req: any, res: any) => {
  try {
    const queryStatus = Common.checkParameter(req.body, ['loginToken', 'construction_index'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key]), { construction_index } = req.body
      const convert_construction = StringJs.orderConstructionReadOnly(jwtOb.construction_site, String(construction_index))

      await Mysql.updateConstruction({
        member_index: jwtOb.member_index,
        construction_site: convert_construction
      })
      const restTime = Common.returnRestTime(jwtOb)
      delete jwtOb['iat'], delete jwtOb['exp'];


      const jwtResult = jwt.sign({
        ...jwtOb,
        construction_site: convert_construction
      }, process.env.JWT_SECRET, { expiresIn: `${restTime}ms` });

      const cookieOptions = deployStatus ? {
        secure: COOKIE_SECURE,
        httpOnly: COOKIE_HTTP_ONLY,
        maxAge: restTime * 1000
      } : {
        // httpOnly: COOKIE_HTTP_ONLY,
        sameSite: "none",
        secure: COOKIE_SECURE,
        maxAge: restTime * 1000
      }

      res.cookie(key, Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.send([1, convert_construction])
    } else {
      res.status(400)
    }
  } catch (err) {
    res.send([-1, err ? err : '관리자에게 문의해주세요'])
  }
})

UserRoute.post('/update_constuction_token', async (req: any, res: any) => {
  try {
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const queryStatus = Common.checkParameter(req.body, ['loginToken', 'construction_index'])

    if (queryStatus) {
      const jwtOb = jwt.decode(cookieInfo[key]), { construction_index } = req.body
      const convert_construction = StringJs.orderConstructionReadOnly(jwtOb.construction_site, String(construction_index))
      const restTime = Common.returnRestTime(jwtOb)
      delete jwtOb['iat'], delete jwtOb['exp'];

      const jwtResult = jwt.sign({
        ...jwtOb,
        construction_site: convert_construction
      }, process.env.JWT_SECRET, { expiresIn: `${restTime}ms` });

      const cookieOptions = deployStatus ? {
        secure: COOKIE_SECURE,
        httpOnly: COOKIE_HTTP_ONLY,
        maxAge: restTime * 1000
      } : {
        // httpOnly: COOKIE_HTTP_ONLY,
        sameSite: "none",
        secure: COOKIE_SECURE,
        maxAge: restTime * 1000
      }

      res.cookie(key, Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.json({ errcode: 0, msg: convert_construction })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.get('/find_id', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['name', 'phone'])

    const filterErr = [
      queryStatus,
      phoneRegexp.test(query.phone),
      await Common.checkPass(req)
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({errcode: 0, msg: await Mysql.findId(query)})
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '전화번호를 다시 기입해주세요',
        '본인인증을 해주세요'
      ]
      res.status(400).json({ errcode: -1, msg: errMsg[errIndex]})

    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.post('/reset_pw', async (req: any, res: any) => {
  try {
    const query = req.body
    const queryStatus = Common.checkParameter(query, ['pw', 'name', 'phone'])
    const privateKey = fs.readFileSync(path.normalize(__dirname + "/../../rsa-private.pem"), { encoding: "utf8" })
    const pw = Common.decryptMessage(
      query.pw,
      privateKey
    );

    const filterErr = [
      queryStatus && pw,
      pw && pwRegexp.test(pw),
      phoneRegexp.test(query.phone),
      await Common.checkPass(req)
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({errcode: 0, msg: await Mysql.updatePasswordNoneLogin({...query, pw: pw})})
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '비밀번호를 다시 기입해주세요',
        '전화번호를 다시 기입해주세요',
        '본인인증을 해주세요'
      ]
      res.status(400).json({ errcode: -1, msg: errMsg[errIndex]})

    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.post('/change_pw', async (req: any, res: any) => {
  try {
    const query = req.body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const queryStatus = Common.checkParameter(query, ['pw', 'new_pw', 'loginToken'])
    const privateKey = fs.readFileSync(path.normalize(__dirname + "/../../rsa-private.pem"), { encoding: "utf8" })
    const pw = Common.decryptMessage(
      query.pw,
      privateKey
    );

    const newPw = Common.decryptMessage(
      query.new_pw,
      privateKey
    );

    const filterErr = [
      queryStatus && pw && newPw,
      newPw && pwRegexp.test(newPw),
      pw !== newPw
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({errcode: 0, msg: await Mysql.updatePasswordLogin({...query, pw: pw, new_pw: newPw, member_index: jwtOb.member_index})})
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '비밀번호를 다시 기입해주세요',
        '이전 비밀번호와 다르게 기입해주세요'
      ]
      res.status(400).json({ errcode: -1, msg: errMsg[errIndex]})

    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.post('/check_pw', async (req: any, res: any) => {
  try {
    const query = req.body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const queryStatus = Common.checkParameter(query, ['pw', 'loginToken'])
    const privateKey = fs.readFileSync(path.normalize(__dirname + "/../../rsa-private.pem"), { encoding: "utf8" })
    const pw = Common.decryptMessage(
      query.pw,
      privateKey
    );

    const filterErr = [
      queryStatus && pw,
      pw && pwRegexp.test(pw),
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({errcode: 0, msg: await Mysql.checkPasswordLogin({...query, pw: pw, member_index: jwtOb.member_index})})
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '비밀번호를 다시 기입해주세요',
      ]
      res.status(400).json({ errcode: -1, msg: errMsg[errIndex]})

    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

UserRoute.post('/update_profile', async (req: any, res: any) => {
  try {
    const body = req.body, { email, birth, sex, phone } = body
    const queryStatus = Common.checkParameter(body, ['email', 'name', 'phone', 'sex', 'birth', 'loginToken'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const filterErr = [
        emailRegexp.test(email),
        phoneRegexp.test(phone),
        birthRegexp.test(birth),
        [1,2].includes(sex)
      ]
      const errIndex = filterErr.indexOf(false)
      if(errIndex === -1){
        res.json({ errcode: 0, msg: await Mysql.updateProfile(jwtOb, body) })
      }else{
        const errMsg = [
          "이메일을 다시 적어주세요",
          "전화번호를 다시 적어주세요",
          "생년월일을 다시 적어주세요",
          "성별을 다시 적어주세요"
        ]
        res.status(400).json({ errcode: -1, msg: errMsg[errIndex]});
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' });
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})


UserRoute.post('/logout', async (req: any, res: any) => {
  try {
    const queryStatus = Common.checkParameter(req.body, ['loginToken'])
    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      await Mysql.logout(jwtOb.member_index)

      res.cookie(await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY), Common.bidirectionalEncrypted("logout"));
      res.json({ errcode: 0, msg: '로그아웃 성공' })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})


export default UserRoute