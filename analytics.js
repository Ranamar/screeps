/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('analytics');
 * mod.thing == 'a thing'; // true
 */
 
var lodash = require('lodash');


module.exports.getWalkScore = function(pos) {
    var stringKey = JSON.stringify(pos);
    var steplog = Game.rooms[pos.roomName].memory.tileLog[stringKey];
    return lodash.sum(steplog);
}

module.exports.logStep = function(creep) {
    //We serialize the position even though the result is a little bigger so it's easy to get out but still a sparse array.
    var stringKey = JSON.stringify(creep.pos);
    if(!('tileLog' in creep.room.memory)) {
        creep.room.memory.tileLog = {};
    }
    var steplog = creep.room.memory.tileLog[stringKey];
    if(Array.isArray(steplog)) {
        steplog[0] = steplog[0] + creep.body.length;
    }
    else {
        var newStepLog = [creep.body.length];
        creep.room.memory.tileLog[stringKey] = newStepLog;
    }
}

module.exports.processLogs = function(room) {
    console.log('processing step logs', room);
    for(spotString in room.memory.tileLog) {
        //deserialize our position
        var deserialized = JSON.parse(spotString);
        var spot = new RoomPosition(deserialized.x, deserialized.y, deserialized.roomName);
        
        //calculate parts per 1000 ticks to prune array
        var steplog = room.memory.tileLog[spotString];
        var stepSum = lodash.sum(steplog);
        if(stepSum == 0) {
            delete room.memory.tileLog[spotString];
        }
        else {
            steplog.unshift(0);
            if(steplog.length > 4) {
                steplog.pop();
            }
        }
    }
}
