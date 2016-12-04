var builder = require('role.builder');
var store = require('role.store');
var upgrader = require('role.upgrader');

var harvester = require('worker.harvest');
var resource = require('worker.resources');
var maintenance = require('structures.maintenance');
var structures = require('worker.structures');

var analytics = require('analytics');

Creep.prototype.assignJob = function(job) {
    this.memory.target = job.target;
    // this.setMode(job.job);
    this.transitionMode(job.job);
}

Creep.prototype.transitionMode = function(newMode) {
    if(newMode == this.memory.mode) {
        return;
    }
    this.say(newMode);
    //exit old mode
    switch(this.memory.mode) {
        case 'harvest':
            this.selectSource();
            break;
        case 'upgrade':
            this.registerUpgrading();
            break;
        default:
            // console.log(creep.name, 'does nothing exiting', creep.memory.mode);
            break;
    }
    //enter new mode
    this.memory.mode = newMode;
    switch(this.memory.mode) {
        case 'harvest':
            this.unregisterGathering();
            break;
        case 'upgrade':
            this.unregisterUpgrading();
            break;
        default:
            break;
    }
}

Creep.prototype.modeOperation = function(target) {
    switch(this.memory.mode) {
        case 'harvest':
            return this.gatherEnergy(target);
            break;
        case 'build':
            return this.build(target);
            break;
        case 'store':
            return this.storeEnergy(target);
            break;
        case 'storeall':
            return this.storeAny(target);
        case 'upgrade':
            console.log(this.name, 'upgrading', this.memory.target);
            // this.registerUpgrading();
            return this.upgradeController(this.room.controller);
            break;
        case 'repair':
            return this.checkedRepair(target);
            break;
        case 'pickup':
            return this.pickup(target);
            break;
        default:
            //Report we can't do it if we don't know what to do.
            // console.log(creep.name, 'does nothing with', creep.memory.mode);
            return ERR_NO_BODYPART;
    }
}

Creep.prototype.workerMove = function() {
    var target = Game.getObjectById(this.memory.target);
    //Try operation
    var result = this.modeOperation(target);
    if(result == OK) {
        return;
    }
    if(!target) {
        console.log(this.name, 'tried to', this.memory.mode, 'with target', this.memory.target, target, result);
    }
    //move if fail
    if(result == ERR_NOT_IN_RANGE) {
        this.moveTo(target);
        //Log movement here, because this is the only time roads decay
        analytics.logStep(this);
    }
    //Handle other error cases
    else if(result == ERR_FULL ||
            result == ERR_NOT_ENOUGH_RESOURCES ||
            result == ERR_INVALID_TARGET) {
        //Out of space - find something else to do.
        this.transitionMode('unassigned');
        //TODO: reassign in same tick
        return;
    }
    //Try operation again
    result = this.modeOperation(target);
    //TODO: Look for targets of opportunity if failed
}

Creep.prototype.enterMode = function() {
    switch(this.memory.mode) {
        case 'harvest':
            return harvester.gatherEnergy(this)
            break;
        case 'build':
            return builder.build(this);
            break;
        case 'store':
            return store.storeEnergy(this);
            break;
        case 'storeall':
            return store.storeAll(this);
        case 'upgrade':
            return upgrader.upgrade(this);
            break;
        case 'repair':
            return builder.repair(this);
            break;
        case 'pickup':
            return harvester.pickupEnergy(this);
            break;
        default:
            // console.log(creep.name, 'does nothing with', creep.memory.mode);
            return false;
    }
};
Creep.prototype.exitMode = function() {
    switch(this.memory.mode) {
        case 'harvest':
            harvester.unregisterGathering(this);
            break;
        case 'upgrade':
            upgrader.exitUpgrade(this);
            break;
        default:
            // console.log(creep.name, 'does nothing exiting', creep.memory.mode);
            break;
    }

};

Creep.prototype.setMode = function(newMode) {
    if(newMode == this.memory.mode) {
        return;
    }
    // console.log('set', creep.name, 'mode', creep.memory.mode, 'to', newMode);
    var currentMode = this.memory.mode;
    this.exitMode();
    this.say(newMode);
    // console.log('generic', creep.name, newMode);
    this.memory.mode = newMode;
    this.enterMode();
};

Creep.prototype.work = function() {
    //currently, our mode entries are our general execution loops
    var result = this.enterMode();
    analytics.logStep(this);
    if(!result) {
        // console.log(creep.name, 'mode', creep.memory.mode, 'failed to do anything', result);
        this.setMode('unassigned');
    }

    if(this.memory.mode != 'harvest' && this.carry.energy < 20 ||
        this.memory.mode == 'harvest' && this.carry.energy == this.carryCapacity) {
        this.setMode('unassigned');
    }
}

Creep.prototype.moveToNewRoom = function() {
    console.log(this.name, 'moving rooms from', this.pos.roomName, 'to', this.memory.destination);
    if(this.pos.roomName == this.memory.destination) {
        this.memory.role = this.memory.destRole;
        delete this.memory.destRole;
    }
    else {
        var target = Game.rooms[this.memory.destination].controller;
        this.moveTo(target);
    }
}
