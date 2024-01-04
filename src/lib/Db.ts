import { Module } from "../Module";

const {mysql, dotenv, path} = Module

// config
dotenv.config({ path: path.normalize(__dirname+'/../../.env') });
const {DB_HOST, DB_ID, DB_PW, DB_DB, MODE} = process.env

// *mysql2/promise는 결과 rowd와  칼럼 모두 내려줍니다. mysql모듈 사용시 결과처럼 사용하려면 0번 인덱스를 한번 태워야합니다
const MysqlPool = mysql.createPool({
    host     : DB_HOST,
    user     : DB_ID,
    password : DB_PW,
    database : DB_DB,
    multipleStatements: true,
    connectionLimit: 10
});

if(MODE === 'DEV'){
    (async function() {
  

        try{
          const connection = await MysqlPool.getConnection()
          console.log("db connected")
        } catch(err){
          console.log(err)
          return
        }
      }
  )();
}
// console.log(MysqlPool)

export default MysqlPool

