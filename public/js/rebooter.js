const { exec } = require('child_process');
const Konsole = require('./djmConsole');
const k= new Konsole('testStuff');

const rebootRPi = () => {
    const fun = `rebootRPI()`;
    k.m(fun, `Rebooting...`)
    setTimeout(() => {
        exec('sudo shutdown -r now', (error, stdout, stderr) =>{
            if(error) {
                k.m(fun, `shutdown(): ERROR: ${error}`);
            }

            if(stdout) {
                k.m(fun, `shutdown(): stdout: ${stdout}`);
            }

            if(stderr) {
                k.m(fun, `shutdown(): stderr: ${stderr}`);
            }
        })
    }, 3000);
}

module.exports = { rebootRPi };
