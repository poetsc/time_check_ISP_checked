const https = require('https');
const schedule = require('node-schedule');
const nodemailer = require('nodemailer');

if (process.argv.length < 3) {
    return console.log('please enter IP address');
}

const china_mainland = 'ipchecking';
const international_area = 'ipchecking2';

const IP = process.argv[2];
const PORT = process.argv[3];
console.log(`monitor IP : ${IP}; PORT : ${PORT}`);

function checkIP(area_type) {
    let options = {
        hostname: 'www.toolsdaquan.com',
        port: 443,
        path: `/toolapi/public/${area_type}/${IP}/${PORT}2`,
        headers: {
            referer: 'https://www.toolsdaquan.com/ipcheck/',
        }
    }

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            if (res.statusCode !== 200) {
                reject({
                    statusCode: res.statusCode
                });
            }

            let result = '';

            res.on('data', (d) => {
                result += d;
            });

            res.on('end', () => {
                try {
                    result = JSON.parse(result);
                    resolve(result);
                } catch (e) {
                    reject({
                        'json_parse_err': e.message
                    });
                }
            });

        }).on('error', (e) => {
            console.error(e.message);
            reject({
                'http_get_err': e.message
            });
        });
    }).then(data => {
        return {
            status: true,
            result: data
        }
    }).catch(err => {
        return {
            status: false,
            err: err
        }
    })
}

function send_email(subject, content) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.qq.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: '1349479530@qq.com', // generated ethereal user
            pass: 'lomtpnnoaisvbacf' // generated ethereal password
        }
    });

    transporter.sendMail({
        from: '"Hostwind VPS IP is blocked!" <1349479530@qq.com>', // sender address
        to: 'lsc7@foxmail.com', // list of receivers
        subject: subject, // Subject line
        html: `<b>${content}</b>` // html body
    });

}

function main(){
    Promise.all([checkIP(china_mainland), checkIP(international_area)]).then(value => {
        if(value.every(el => {return el.status === true;})){
            let access = value.filter((el,index) => {
                if(index === 0){
                    return el.result && el.result.icmp === 'success' || el.result.tcp === 'success';
                }else{
                    return el.result && el.result.outside_icmp === 'success' || el.result.outside_tcp === 'success';
                }
            });
            switch(access.length){
                case 0:
                    console.log('国内和国外都不可用');
                    break;
                case 1:
                    let title = '';
                    if(access[0].result.outside_icmp && access[0].result.outside_tcp){
                        title = '国内访问被墙';
                    }else{
                        title = '国外访问被墙';
                    }
                    console.log(title);
                    send_email(title,JSON.stringify(value));
                    break;
                case 2:
                    break;
                default:
                    console.log('abnormal',access);
            }
        }else{

        }
    }).catch(err => {
        console.log(err);
    })
}

var j = schedule.scheduleJob('0 */2 * * *', () => {
   main(); 
});

main();
