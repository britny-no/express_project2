export namespace Module {
    // for pinpoint
    export const dotenv = require('dotenv');
    export const path = require("path");
    dotenv.config({ path: path.normalize(__dirname + '/../.env') });
    // require('pinpoint-node-agent')
    // for pinpoint
    export const exec = require("child_process").exec;
    export const express = require("express");
    export const https = require('https')
    export const httpsLocalhost = require("https-localhost")()
    export const memjs = require('memjs');

    export const bodyParser = require('body-parser');
    export const cors = require('cors');
    export const sanitizeHtml = require('sanitize-html');
    export const jwt = require('jsonwebtoken')
    export const cookieParser = require('cookie-parser');
    export const axios = require("axios");
    export const cacheManager = require('cache-manager');
    export const cryptoJs = require('crypto-js')
    export const crypto = require('crypto');
    const NodeRSA = require("encrypt-rsa").default
    export const nodeRSA = new NodeRSA();
    // export const mysql = require('mysql')
    // export const mysql = require('mysql2')
    export const mysql = require('mysql2/promise')
    export const fs = require('fs');
    // export const AWS = require('aws-sdk');
    // export const multer  = require('multer');
    // export const multerS3  = require('multer-s3');

    const moment = require('moment');
    require('moment-timezone');
    moment.tz.setDefault("Asia/Seoul");
    export const seoulMoment = moment
}



