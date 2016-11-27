/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('visualizer');
 * mod.thing == 'a thing'; // true
 */

var logStep = function(creep) {
    var tileFlags = creep.room.lookForAt(LOOK_FLAGS, creep.pos);
    var flag = null;
    if(tileFlags.length > 0) {
        flag = tileFlags[0];
    }
    else {
        var newFlagName = creep.room.createFlag(creep.pos);
        flag = Game.flags[newFlagName];
        flag.memory.steps = 0;
    }
    flag.memory.steps = flag.memory.steps + 1;
    var minorCount = (flag.memory.steps % 10) + 1;
    var majorCount = Math.floor(flag.memory.steps / 10) + 1;
    //Rail out with white/white
    if(majorCount > 10) {
        majorCount = 10;
        minorCount = 10;
    }
    var result = flag.setColor(majorCount, minorCount);
    if(result < 0) {
        console.log('>> Got error setting colors', majorCount, minorCount);
    }
}

module.exports = {
    logStep: logStep
};
