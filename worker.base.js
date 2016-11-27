var builder = require('role.builder');
var harvester = require('role.harvester');
var store = require('role.store');
var upgrader = require('role.upgrader');

var doModeEntry = function(creep) {
    switch(creep.memory.mode) {
        case 'harvest':
            return harvester.gatherEnergy(creep)
            break;
        case 'build':
            return builder.build(creep);
            break;
        case 'store':
            return store.storeEnergy(creep);
            break;
        case 'upgrade':
            return upgrader.upgrade(creep);
            break;
        case 'repair':
            return builder.repair(creep);
            break;
        case 'pickup':
            return harvester.pickupEnergy(creep);
            break;
        default:
            // console.log(creep.name, 'does nothing with', creep.memory.mode);
            return false;
    }
};
var doModeExit = function(creep) {
    switch(creep.memory.mode) {
        case 'harvest':
            harvester.unregisterGathering(creep);
            break;
        case 'upgrade':
            upgrader.exitUpgrade(creep);
            break;
        default:
            // console.log(creep.name, 'does nothing exiting', creep.memory.mode);
            break;
    }

};

var setMode = function(creep, newMode) {
    if(newMode == creep.memory.mode) {
        // console.log(creep.name, 'setting mode to current mode', newMode);
        return;
    }
    // console.log('set', creep.name, 'mode', creep.memory.mode, 'to', newMode);
    var currentMode = creep.memory.mode;
    doModeExit(creep);
    creep.say(newMode);
    // console.log('generic', creep.name, newMode);
    creep.memory.mode = newMode;
    doModeEntry(creep);
};

var doJob = function(creep) {
    //currently, our mode entries are our general execution loops
    var result = doModeEntry(creep);
    if(!result) {
        // console.log(creep.name, 'mode', creep.memory.mode, 'failed to do anything', result);
        setMode(creep, 'unassigned');
    }

    if(creep.memory.mode != 'harvest' && creep.carry.energy == 0 ||
        creep.memory.mode == 'harvest' && creep.carry.energy == creep.carryCapacity) {
        setMode(creep, 'unassigned');
    }
}

var assignJob = function(creep, job) {
    setMode(creep, job.job);
    creep.memory.target = job.target;
}

module.exports = {
    enterMode: setMode,
    assignJob: assignJob,
    run: doJob
};