import { Module } from "../Module";

const {memjs} = Module
const MemjsClient = memjs.Client.create(process.env.MEMCACHED_HOST, {
    // username: 'username',
    // password: 'password'
  });   


export default MemjsClient

