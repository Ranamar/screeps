/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('visualizer');
 * mod.thing == 'a thing'; // true
 */

var lodash = require('lodash');

var calcFlagColors = function(count) {
    var normalizedCount = Math.floor(count / 10);
    var minorCount = (normalizedCount % 10) + 1;
    var majorCount = Math.floor(normalizedCount / 10) + 1;
    //Rail out with white/white
    if(majorCount > 10) {
        majorCount = 10;
        minorCount = 10;
    }
    return [majorCount, minorCount];
}

var getRoomPosMemory = function(pos) {
    var stringKey = JSON.stringify(pos);
    return Game.rooms[pos.roomName].memory.tileLog[stringKey];
}

var logStep = function(creep) {
    var stringKey = JSON.stringify(creep.pos);
    var steplog = creep.room.memory.tileLog[stringKey];
    if(Array.isArray(steplog)) {
        steplog[0] = steplog[0] + creep.body.length;
    }
    else {
        var newStepLog = [creep.body.length];
        creep.room.memory.tileLog[stringKey] = newStepLog;
    }
}

var decayFlags = function(room) {
    var flags = room.find(FIND_FLAGS);
    for(var i = 0; i < flags.length; i++) {
        var flag = flags[i];
        var newSteps = Math.floor(flag.memory.steps * 0.8);
        if(newSteps == 0) {
            var name = flag.name;
            flag.remove();
            delete Memory.flags[name];
        }
        else {
            flag.memory.steps = newSteps;
        }
    }
}

var updateFlags = function(room) {
    console.log('update flags', room);
    for(spotString in room.memory.tileLog) {
        //deserialize our shit
        var deserialized = JSON.parse(spotString);
        var spot = new RoomPosition(deserialized.x, deserialized.y, deserialized.roomName);
        
        //calculate parts per 1000 ticks
        var steplog = room.memory.tileLog[spotString];
        var stepSum = lodash.sum(steplog);
        
        //color flag
        var flagColors = calcFlagColors(stepSum);
        var tileFlags = room.lookForAt(LOOK_FLAGS, spot);
        if(tileFlags.length > 0) {
            var flag = tileFlags[0];
            if(stepSum > 0) {
                flag.setColor(flagColors[0], flagColors[1]);
            }
            else {
                var name = flag.name;
                flag.remove();
                delete Memory.flags[name];
            }
        }
        else if(stepSum > 0) {
            room.createFlag(spot, null, flagColors[0], flagColors[1]);
        }
        
        //update array for next round
        steplog.unshift(0);
        while(steplog.length > 10) {
            steplog.pop();
        }
    }
}

var cullFlags = function(room) {
    console.log("culling flags");
    var flags = room.find(FIND_FLAGS);
    var tileLog = room.memory.tileLog;
    for(var i = 0; i < flags.length; i++) {
        var flag = flags[i];
        var stringKey = JSON.stringify(flag.pos);
        if(!(stringKey in tileLog)) {
            flag.remove();
            delete Memory.flags[flag.name];
        }
    }
}

module.exports = {
    logStep: logSep,
    decayFlags: updateFlags,
    cullFlags: cullFlags
};
