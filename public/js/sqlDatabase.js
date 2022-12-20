const notifier = require('./notifier');
const sqlite3 = require('sqlite3').verbose();
const {open} = require('sqlite');
let isInit = false;
let wmDB = undefined;
let scheduleJSON = [];
let scheduleFLAT = [];
let tvAuto = 'tvAutoOff';
let hdmiConfigVal = 1;
let scheduleSource = undefined;
let apiServerState = undefined;
// const dbFileName = "/home/pi/Node-WebMod/node/node_express/database/webModDB.db";
const dbFileName = "/home/pi/strictlyLIVE/database/webModDB.db";
const myDeviceName = 'webModDatabase';
console.log(`${myDeviceName}: Loading webModDatabase.js...`);
console.log(`${myDeviceName}: DB path: ${dbFileName}`);
const defaultSchedule = [ // Array of objects. //
	{
		'day': 'Tuesday',
		'title': 'Tuesday Evening Service',
		'start': '19:25',
		'startLabel': ' 7:25 PM',
		'end': '20:10',
		'url': 'https://www.youtube.com/user/ApostolicFaithHQ/live',
        'source': 'client',
        'enabled': "on"
	},
	{
		'day': 'Friday',
		'title': 'Friday Evening Service',
		'start': '19:25',
		'startLabel': '7:25 PM',
		'end': '20:45',
		'url': 'https://www.youtube.com/user/ApostolicFaithHQ/live',
        'source': 'client',
        'enabled': "on"
	},
	{
		'day': 'Sunday',
		'title': 'Sunday School',
		'start': '09:25',
		'startLabel': ' 9:25 AM',
		'end': '10:05',
		'url': 'https://www.youtube.com/user/ApostolicFaithHQ/live',
        'source': 'client',
        'enabled': "on"
	},
	{
		'day': 'Sunday',
		'title': 'Sunday Morning Service',
		'start': '10:50',
		'startLabel': '10:50 AM',
		'end': '12:30',
		'url': 'https://www.youtube.com/user/ApostolicFaithHQ/live',
        'source': 'client',
        'enabled': "on"
	},
	{
		'day': 'Sunday',
		'title': 'Sunday Evening Service',
		'start': '17:50',
		'startLabel': '5:55 PM',
		'end': '19:15',
		'url': 'https://www.youtube.com/user/ApostolicFaithHQ/live',
        'source': 'client',
        'enabled': "on"
	},
	{
		'day': 'Wednesday',
		'title': 'Eagles',
		'start': '10:00',
		'startLabel': '10:00 AM',
		'end': '10:10',
		'url': 'https://youtu.be/eTAsANPVqB8',
        'source': 'client',
        'enabled': "on"
	}
];

async function main() {
    try {
        wmDB = await openDB();
        const isTablesCreated = await checkTablesAreCreated().then((resultFromCreateTables) => {
			return resultFromCreateTables;
		});

		if (!isTablesCreated) {
			let tCount = await createAllTables2().then((tCount) => {
				return tCount;
			});

			let eventsInserted = await insertBlockData(defaultSchedule, true).then((eCount) => {
				return eCount;
			});

			if(eventsInserted > 1) {
				await readScheduleDb2().then((readItemsArray) => {
                    if (!readItemsArray) {
                        throw new Error(`${myDeviceName}: readItemsArry is undefined at line 85.`);
                    }
				});
			}
		} else { 
			await readScheduleDb2().then(() => {
				const sfl = scheduleFLAT.length;
				const sjl = scheduleJSON.length;
				if((sfl > 0) && (sjl > 0)) {
				} else {
					throw `${myDeviceName}: After calling readScheduleDb2, scheduleFLAT length: ${sfl}, scheduleJSON length: ${sjl}.`;
				}
			});
		}
    } catch (error) {
		console.error(`${myDeviceName}: main(): ERROR: ${error}`);
		throw error;
    }
}

async function checkTablesAreCreated() {
    if (!wmDB) {
        await openDB();
    }

    try {
		const query = `SELECT name FROM sqlite_master WHERE type='table';`;
		let results = await wmDB.get(query).then((queryResults) => {
			if(queryResults === undefined) {
				return false;
			} else {
				return true;
			}
		});
		return results;
    } catch (error) {
        console.error(`${myDeviceName}: checkTablesAreCreated(): ERROR: ${error}`);
        throw error;
    }
}

async function   createAllTables2() {
	let tableCount = 0;
	try {
		tableCount = await wmDB.run("CREATE TABLE IF NOT EXISTS \
			events(\
				day TEXT, \
				title TEXT, \
				start TEXT, \
				startLabel TEXT, \
				end TEXT, \
				url TEXT, \
                source TEXT, \
                enabled TEXT \
			);"
		).then(() => {
			tableCount += 1;
			return tableCount;
		});
	} catch (error) {
        console.error(`${myDeviceName}: createAllTables2(): Part one: ERROR: ${error}`);
        throw error;
	}
	
	try {
		tableCount = await wmDB.run("CREATE TABLE IF NOT EXISTS \
			logs(\
				date TEXT, \
				log TEXT \
			);"
		).then(() => {
			tableCount += 1;
			return tableCount;
		});
	} catch (error) {
        console.error(`${myDeviceName}: createAllTables2(): Part 2: ERROR: ${error}`);
        throw error;
    }
    
	try {
		tableCount = await wmDB.run("CREATE TABLE IF NOT EXISTS \
			settings(tvAuto TEXT, scheduleSource TEXT, hdmiConfig TEXT);"
		).then(() => {
			tableCount += 1;
			return tableCount;
		});
	} catch (error) {
        console.error(`${myDeviceName}: createAllTables2(): Part 3: ERROR: ${error}`);
        throw error;
    }

    return tableCount;
}

async function insertEvent(eventIn) {
	try {
		let {day, title, start, startLabel, end, url, source, enabled} = eventIn;
		const insertString = 'INSERT INTO events (day, title, start, startLabel, end, url, source, enabled) VALUES (?,?,?,?,?,?,?,?);';
		await wmDB.run(insertString, [day, title, start, startLabel, end, url, source, enabled]).then(() => {
			notifier.emit('database_sends_message', {'message':'event insert successful', 'data': ''})
		});
	} catch(error) {
		console.log(`${myDeviceName}: insertEvent(): Part 1: ERROR: ${error}`);
		throw error;
	}
	try {
		// UPDATE SCHEDULEFLAT AND SCHEDULEJSON ARRAYS.
		await readScheduleDb2();
	} catch (error) {
		conslog.log(`${myDeviceName}: insertEvent(): Part 2: call readScheduleDB2() ERROR: ${error}.`);
		throw error;		
	}
}

async function insertBlockData(arrayIn, init=false) {
	try {
		let insertEventsCount = 0;
		for(let obj of arrayIn) {
			let {day, title, start, startLabel, end, url, source, enabled} = obj;
			const insertString1 = 'INSERT INTO events (day, title, start, startLabel, end, url, source, enabled) VALUES (?,?,?,?,?,?,?,?)';
			await wmDB.run(insertString1, [day, title, start, startLabel, end, url, source, enabled]).then(() => {
				insertEventsCount += 1;
                console.log(`${myDeviceName}:insertDefaultData2():insertEvetsCount:${insertEventsCount}`);
            });
        }

        if(init) {
            const insertString2 = 'INSERT INTO settings (tvAuto, scheduleSource, hdmiConfig) VALUES (?, ?, ?)';
            await wmDB.run(insertString2, ['tvAutoOff', 'client', '2']).then(() => {
                insertEventsCount += 1;
            });
        }

		return insertEventsCount;
	} catch(error) {
		console.error(`${myDeviceName}:insertDefaultData2(): ERROR: ${error}`);
		throw error;
	}
}

async function deleteBlockData(deleteBySourceVal) {
    console.log(`${myDeviceName}:deleteBlockData() begin...`);
    const deleteString = `DELETE FROM events WHERE source="${deleteBySourceVal}";`
    try {
        let delRes = await wmDB.run(deleteString).then((result) => {
            return result;
        });
        return delRes;
    } catch (error) {
		throw new Error(`${myDeviceName}: deleteBlockData() ERROR: ${error}.`); 
    }
}

/**
 * readScheduleDb2()
 * Reads the events table in webModDatabase.db then stores the records into global 
 * scheduleFLAT, then calls flatToJSON() to convert the results to global scheduleJSON.
 * The Events table is previously populated by API data, defaultSchedule data OR 
 * schedule edits made by the User via the Schedule UI.  API data 'source' field 
 * is set to 'server', defaultSchedule and Schedule UI data 'source' field is set 
 * to 'client'.
 * This function will query this database to learn which data is to be harvested 
 * based on the 'source'field.
 * Inputs: None
 */
async function readScheduleDb2() {
    let schedSource = await readScheduleSource();
    if(schedSource === 'server' && apiServerState === 'offline') {schedSource = 'client'}
    let queryString = `SELECT rowid AS id, day, title, start, startLabel, end, url, source, enabled FROM events WHERE source="${schedSource}" order by \
day='Monday' DESC, \
day='Tuesday' DESC, \
day='Wednesday' DESC, \
day='Thursday' DESC, \
day='Friday' DESC, \
day='Saturday' DESC, \
day='Sunday' DESC, start;`
    console.log(`${myDeviceName}:readScheduleDb2():queryString:${queryString}`);
	scheduleFLAT = []; 
    scheduleJSON = [];
	try {
		let eventArray = await wmDB.all(queryString).then((rows) => {
            if (!rows) {
                throw new Error(`${myDeviceName}: readScheduleDb2(): ERROR: returned rows array is undefined.`);
            }
			scheduleFLAT = rows;
			return rows;
		});

        await flatToJSON(eventArray);

        return eventArray;
	} catch (error) {
		console.error(`${myDeviceName}: readScheduleDb2(): ${error}.`);
		throw error;
	}
}

// NOTIFIER EVENTS BOILERPLATE
notifier.on('connect', () => {
    console.log(`${myDeviceName}: connected to index.js.`);
});

notifier.on('server_sends_message', (data) => {
    let message = data.message;
    if (![
            'send_id', 
            'update_event', 
            'add_event', 
            'delete_event', 
            'tvAutoOn', 
            'tvAutoOff', 
            'setScheduleSource', 
            'api_ready_echo',
            'hdmi_config'
        ].includes(message)) { return; }

    if (message === 'send_id') {
		notifier.emit('client_sends_id', { 'id': myDeviceName });
	} else if (message === 'update_event') {
		updateEvent(data.data);
	} else if (message === 'add_event') {
		insertEvent(data.data);
	} else if (message === 'delete_event') {
		deleteEvent(data.data)
	} else if (['tvAutoOn', 'tvAutoOff'].includes(message)) {
        updateTvAuto(message);
    } else if (message === 'setScheduleSource') {
        updateScheduleSource(data.data);
    } else if (message === 'api_ready_echo') {
        console.log(`${myDeviceName}:server_sends_message:${message}.`);
        console.log(`${myDeviceName}:apiServerState: ${data.data.state}.<<<<<<<<<<<<<<<`);
        apiServerState = data.data.state;
        updateAPISchedule(data.data.schedule);
    } else if (message === 'hdmi_config') {
        console.log(`${myDeviceName}: message: hdmi_config: value: ${data.data}.`);
        updateHDMIConfig(data.data);
    }
});

///////////////////////////
/**
 * updateAPISchedule() - Firstly, delete all records tagged with 'server' 
 * from the settings table.
 *  - Secondly, insert the Schedules obtained from the API Server.
 * @param {array} scheduleInArray - Array of Schedule objects obtained 
 * from the API Server.
 */
function updateAPISchedule(scheduleInArray) {
    // DELETE ALL RECORDS IN SETTINGS TABLE THAT ARE TAGGED 'SERVER'.
    deleteBlockData('server').then(result => {
        insertBlockData(scheduleInArray).then(result2 => {
            console.log(`${myDeviceName}:updateAPISchedule():insertBlockData:result2:${result2}`);
        })
        .then(result3 => {
            console.log(`${myDeviceName}:updateAPISchedule():insertBlockData().then():result3:${result3}`);
            readScheduleDb2();
        })
    })
}

function flatToJSON(flatRowsIn) {
	scheduleJSON = [];
	let dayIsTaken = [];
	flatRowsIn.forEach(elem => {
		let day = elem.day;
        
		if(!dayIsTaken.includes(day)) {
			dayIsTaken.push(day);
			let tempObj = {'day': day, 'events': [{
				'id': elem.id,
				'title': elem.title,
				'start': elem.start,
				'startLabel': elem.startLabel,
				'end': elem.end,
				'url': elem.url,
                'source': elem.source,
                'enabled': elem.enabled
			}]};
			scheduleJSON.push(tempObj);
		} else {
			scheduleJSON.forEach((elem2) => {
				if(elem.day === elem2.day) {
					elem2.events.push({
						'id': elem.id,
						'title': elem.title,
						'start': elem.start,
						'startLabel': elem.startLabel,
						'end': elem.end,
						'url': elem.url,
                        'source': elem.source,
                        'enabled': elem.enabled
					});
				}
			})
		}
	});
    let payLoad = {
        'message': 'schedule_changed', 
        'scheduleFLAT': scheduleFLAT, 
        'scheduleJSON': scheduleJSON, 
        'scheduleSource': scheduleSource,
        'hdmiConfigVal': hdmiConfigVal,
        'apiServerState': apiServerState
    };
    notifier.emit('database_sends_message', payLoad);
}

// EXPORTED FUNCTIONS
const insertLogData = async(dateIn, logIn) => {
    try {
        let log = `${dateIn}: ${logIn}`;
        const insertString = 'INSERT INTO logs (date, log) VALUES (?,?);';
        await wmDB.run(insertString, [dateIn, logIn]).then((result) => {
            // Do nothing.
	    });
        // await wmDB.close();
    } catch (error) {
        console.error(`${myDeviceName}: insertLogData() ERROR: ${error}.`);
		throw error;
    }
}

const readLogs = async() => {
    if(!wmDB) {
		await openDB();
	}

    let dataOut = [];
	try {
		dataOut = await wmDB.all("SELECT rowid, date, log FROM logs;", (err, rows) => {
            if (err) {
                console.log(`${myDeviceName}: ERROR ${err}`)
            }
			return rows;
		});
	} catch (error) {
		console.error(`${myDeviceName}: readLogs() ERROR: ${error}.`);
		throw error;
	}

    return dataOut;
}

let deleteLogs = async() => {
    try {
        const deleteString = 'DELETE FROM logs;';
        await wmDB.run(deleteString).then((result) => {
            return result;
        });
    } catch (error) {
        console.error(`${myDeviceName}: deleteLogs() ERROR: ${error}.`);
		throw new Error(`${myDeviceName}: deleteLogs() ERROR: ${error}.`); 
    }
}

const updateEvent = async(eventIn) => {
	if(!wmDB) {
		await openDB();
	}
	let dataIn = {id, day, title, start, startLabel, end, url, source, enabled} = eventIn;
	let sql = `UPDATE events SET day= '${dataIn.day}', title = '${dataIn.title}', start = '${dataIn.start}', startLabel = '${dataIn.startLabel}', end = '${dataIn.end}', url = '${dataIn.url}', source = '${dataIn.source}', enabled = '${dataIn.enabled}' WHERE rowid = '${dataIn.id}';`;
	try {
		await wmDB.run(sql).then((results) => {
		});
	} catch(error) {
        console.error(`${myDeviceName}: updateEvent(): Part 1: ERROR: ${error}`);
		throw new Error(`${myDeviceName}: updateEvent(): Part 1: ERROR: ${error}`);
	}

	try {
		// UPDATE SCHEDULEFLAT AND SCHEDULEJSON ARRAYS.
		await readScheduleDb2();
	} catch (error) {
		conslog.error(`${myDeviceName}: updateEvent(): Part 2: call readScheduleDB2() ERROR: ${error}.`);
		throw new Error(`${myDeviceName}: updateEvent(): Part 2: call readScheduleDB2() ERROR: ${error}.`);
	}
}

async function deleteEvent(idIn) {
	try {
		let sql = `DELETE FROM events WHERE rowid = ${idIn};`;
		await wmDB.run(sql).then((results) => {
			notifier.emit('database_sends_message', {'message': 'delete_results', 'data': results});
		})
	} catch (error) {
		console.error(`${myDeviceName}: deleteEvent() ERROR: ${error}.`);
		throw new Error(`${myDeviceName}: deleteEvent() ERROR: ${error}.`);
	}

	try {
		await readScheduleDb2();
	} catch (error) {
		conslog.error(`${myDeviceName}: deleteEvent(): Part 2: call readScheduleDB2() ERROR: ${error}.`);
		throw new Error(`${myDeviceName}: deleteEvent(): Part 2: call readScheduleDB2() ERROR: ${error}.`);		
	}
}

const updateTvAuto = async(dataIn) => {
	if(!wmDB) {
		await openDB();
	}
	let sql = `UPDATE settings SET 'tvAuto' = '${dataIn}';`;
	try {
		await wmDB.run(sql).then((results) => {
		});
	} catch(error) {
		console.error(`${myDeviceName}: updateTvAuto() ERROR: ${error}.`);
		throw new Error(`${myDeviceName}: updateTvAuto() ERROR: ${error}.`);
	}
}

const updateScheduleSource = async(dataIn) => {
	if(!wmDB) {
		await openDB();
	}
	let sql = `UPDATE settings SET 'scheduleSource' = '${dataIn}';`; // data = 'client' or 'server' //
	try {
		await wmDB.run(sql).then((results) => {
            console.log(`${myDeviceName}:updateScheduleSource:results:`);
            console.dir(results);
		});
	} catch(error) {
		throw new Error(`${myDeviceName}: updateScheduleSource() ERROR: ${error}.`);
	}
}

const updateHDMIConfig = async(dataIn) => {
    if(!wmDB) {
        await openDB();
    }
    let sql = `UPDATE settings SET 'hdmiConfig' = '${dataIn}';`;
    try {
        await wmDB.run(sql).then((results) => {
            console.log(`${myDeviceName}:updateHDMIConfig():results:`);
            console.dir(results);            
        })
    } catch(error) {
        throw new Error(`${myDeviceName}: updateHDMIConfig() ERROR: ${error}`);
    }
}

const readTvAuto = async() => {
	if(!wmDB) {
		await openDB();
	}
	try {
		tvAuto = await wmDB.get("SELECT tvAuto FROM settings;").then((results) => {
            return results;
		});
	} catch (error) {
		console.error(`${myDeviceName}: readTvAuto(): ERROR: ${error}`);
		throw new Error(`${myDeviceName}: readTvAuto(): ERROR: ${error}`);
    }
    
    return tvAuto;
}

const readScheduleSource = async() => {
	if(!wmDB) {
		await openDB();
	}
	try {
		scheduleSource = await wmDB.get("SELECT scheduleSource FROM settings;").then((row) => {
            let setting = row.scheduleSource;
            console.log(`${myDeviceName}:readScheduleSource():setting: ${setting}`);
            return setting;
		});
	} catch (error) {
		throw new Error(`${myDeviceName}: readScheduleSource(): ERROR: ${error}`);
    }
    console.log(`${myDeviceName}:readScheduleSource():result:${scheduleSource}.`);
    return scheduleSource;
}

const getScheduleFLAT = () => {
	return scheduleFLAT;
}

const getScheduleJSON = () => {
	return scheduleJSON;
}

async function getLogs() {
    if(!wmDB) {
		await openDB();
	}
    let logs = await readLogs().then((rows) => {
        return rows;
    });
    return logs;
}

const getHDMIConfig = async() => {
	if(!wmDB) {
		await openDB();
	}
	try {
		hdmiConfigVal = await wmDB.get("SELECT hdmiConfig FROM settings;").then((row) => {
            let setting = row.hdmiConfig;
            return setting;
		});
	} catch (error) {
		throw new Error(`${myDeviceName}: getHDMIConfig(): ERROR: ${error}`);
    }

    return hdmiConfigVal;
}

async function trimLogsTo100() {
    if(!wmDB) {
		await openDB();
	}
    let deleteResults = undefined;
    try {
		deleteResults = await wmDB.run("DELETE FROM logs WHERE rowid NOT IN (SELECT rowid FROM logs ORDER BY rowid DESC LIMIT 100);")
        .then((results) => {
            return results;
		});
	} catch (error) {
		throw new Error(`${myDeviceName}: trimLogsTo100(): ERROR: ${error}`);
    }
    
    return deleteResults;
}

function setApiServerState(flagIn) {
    if(['offline', 'online'].include(flagIn)) {
        throw new Error(`${myDeviceName}:setApiServerState(): invalid value for apiServerState: ${flagIn}`);
    }
    
    apiServerState = flagIn;
}

function readAPIServerState() {
    return apiServerState;
}

const openDB = async() => {
    await open({
        filename: dbFileName,
        driver: sqlite3.Database
    })
        .then((dbObj) => {
            wmDB = dbObj;
            console.log(`${myDeviceName}: Database connection successful.`);
        })
}

main();

module.exports = {
    readLogs: readLogs,
    openDB: openDB,
	getLogs: getLogs,
    deleteBlockData: deleteBlockData,
    deleteLogs: deleteLogs,
    trimLogsTo100: trimLogsTo100,
    insertBlockData: insertBlockData,
	insertLogData: insertLogData,
	getScheduleFLAT: getScheduleFLAT,
	getScheduleJSON: getScheduleJSON,
    getHDMIConfig: getHDMIConfig,
    updateEvent: updateEvent,
    updateTvAuto: updateTvAuto,
    updateScheduleSource: updateScheduleSource,
    updateHDMIConfig: updateHDMIConfig,
    readTvAuto: readTvAuto,
    setApiServerState: setApiServerState,
    readAPIServerState: readAPIServerState,
    readScheduleSource: readScheduleSource,
    readScheduleDb2, readScheduleDb2
}
