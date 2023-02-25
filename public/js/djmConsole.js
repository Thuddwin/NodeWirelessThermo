
class Konsole {
    deviceName = '';
    initialized = false;

    constructor(device) {
        this.deviceName = device;
        this.initialized = true;
    }

    m(fun, message) {
        if(!this.initialized) { error(); return; }
        if (typeof(message) === 'object') {
            console.log(`${this.deviceName}: ${fun}: OBJECT contents:`)
            console.log(message);
        } else {
            console.log(`\n${this.deviceName}: ${fun}: ${message}`);
        }
    }

    err() {
        console.error('Konsole ERROR: Must be initialized with a device name before using.');
    }
}

module.exports = Konsole;