/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('analytics');
 * mod.thing == 'a thing'; // true
 */
 
var lodash = require('lodash');
var profiler = require('screeps-profiler');


var getWalkScore = function(pos) {
    var stringKey = JSON.stringify(pos);
    var steplog = Game.rooms[pos.roomName].memory.tileLog[stringKey];
    if(Array.isArray(steplog)) {
        let steps = lodash.sum(steplog);
        let replacement = {
            log: steplog,
            stepSum: steps
        };
        Game.rooms[pos.roomName].memory.tileLog[stringKey] = replacement;
    }
    if(steplog) {
        return steplog.stepSum;
    }
    else {
        return 0;
    }
}
profiler.registerFN(getWalkScore, "analytics.getWalkScore");

var logStep = function(creep) {
    //We serialize the position even though the result is a little bigger so it's easy to get out but still a sparse array.
    var stringKey = JSON.stringify(creep.pos);
    if(!('tileLog' in creep.room.memory)) {
        creep.room.memory.tileLog = {};
    }
    var steplog = creep.room.memory.tileLog[stringKey];
    if(Array.isArray(steplog)) {
        steplog[0] = steplog[0] + creep.body.length;
    }
    else if(steplog) {
        steplog.log[0] = steplog.log[0] + creep.body.length;
    }
    else if(!steplog) {
        console.log('creating new log for', creep.pos);
        // var newStepLog = [creep.body.length];
        // creep.room.memory.tileLog[stringKey] = newStepLog;
        let newLog = {
            log: [creep.body.length],
            stepSum: 0
        };
        creep.room.memory.tileLog[stringKey] = newLog;
    }
    else {
        console.log('Step log for', creep.pos, 'is neither array nor object nor undefined');
    }
}
profiler.registerFN(logStep, "analytics.logStep");

Creep.prototype.loggedMove = function(dest) {
    let result = this.moveTo(dest);
    if(result == OK) {
        //Log movement here, because this is the only time roads decay
        logStep(this);
    }
}

const road_cost = 300;
const sample_span = 250;
const sample_count = 6;
const road_life = 50000;
const creep_life = 1500;
const part_cost = 50;

//roadCost <= (road_life/sample_window)*(part_cost/creep_life)*parts_sampled*delay
//to be worth it, we need:
//partsSampled >= (road_cost/delay)*(sample_window/road_life)*(creep_life/part_cost)
const roadMinScoreLookup = {
    'swamp': (road_cost*5/4)*(sample_span*sample_count/road_life)*(creep_life/part_cost),
    'plain': (road_cost)*(sample_span*sample_count/road_life)*(creep_life/part_cost)
};
function dropValueRoad(spot, tileScore) {
    var ticksOnLand;
    var roadCost;
    var room = Game.rooms[spot.roomName];
    var terrain = room.lookForAt(LOOK_TERRAIN, spot);
    
    var roadMinimumScore = roadMinScoreLookup[terrain];

    if(tileScore > roadMinimumScore) {
        //This will fail if we already have something, so we don't need to check that ourselves
        room.createConstructionSite(spot, STRUCTURE_ROAD);
    }
}
profiler.registerFN(dropValueRoad, "analytics.dropValueRoad");

var processLogs = function(roomName) {
    let roomMemory = Memory.rooms[roomName];
    if(!('tileLog' in roomMemory))
        return;
    console.log('processing step logs', roomName);
    let tileLog = roomMemory.tileLog;
    let room = Game.rooms[roomName];
    for(spotString in tileLog) {
        //deserialize our position
        let deserialized = JSON.parse(spotString);
        let spot = new RoomPosition(deserialized.x, deserialized.y, deserialized.roomName);
        
        //calculate parts per 1000 ticks to prune array
        let steplog = tileLog[spotString];
        let stepSum = 0;
        if(Array.isArray(steplog)) {
            stepSum = lodash.sum(steplog);
        }
        else {
            stepSum = lodash.sum(steplog.log);
            steplog.stepSum = stepSum;
            if(steplog.stepsum) {
                delete steplog.stepsum;
            }
        }
        
        if(stepSum == 0) {
            delete tileLog[spotString];
        }
        else {
            if(Array.isArray(steplog)) {
                steplog.unshift(0);
                if(steplog.length > sample_count) {
                    steplog.pop();
                }
            }
            else {
                steplog.log.unshift(0);
                if(steplog.log.length > sample_count) {
                    steplog.log.pop();
                }
            }
            //arbitrarily chosen value slightly lower than the lower breakeven value
            if(room && stepSum > 150) {
                dropValueRoad(spot, stepSum);
                
            }
        }
    }
}
profiler.registerFN(processLogs, "analytics.processLogs");

var analytics = {
    getWalkScore: getWalkScore,
    logStep: logStep,
    processLogs: processLogs,
    sampleSpan: sample_span,
    sampleCount: sample_count
}

// profiler.registerObject(analytics, 'analytics');

module.exports = analytics;