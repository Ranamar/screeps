// var builder = require('role.builder');
// var store = require('role.store');
// var upgrader = require('role.upgrader');

var harvester = require('worker.harvest');
var resource = require('worker.resources');
var maintenance = require('structures.maintenance');
var structures = require('worker.structures');

var analytics = require('analytics');

Creep.prototype.assignJob = function(job) {
    // console.log(this.name, 'assigning job', job.job, job.target);
    // this.memory.target = job.target;
    this.transitionMode(job.job, job.target);
}

Creep.prototype.transitionMode = function(newMode, newTarget) {
    if(newMode == this.memory.mode) {
        return;
    }
    // console.log(this.name, 'transitioning mode', newMode, newTarget);
    if(!newMode) {
        console.log(this.name, 'missing mode', this.mode, newMode);
        this.say('missing mode');
    }
    else {
        this.say(newMode);
    }
    //exit old mode
    this.clearMode();
    //enter new mode
    this.memory.mode = newMode;
    this.initMode(newMode, newTarget);
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
            // console.log(this.name, 'upgrading', this.room.controller, this.memory.target);
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

Creep.prototype.localMaintenance = function() {
        var construction = this.pos.findInRange(this.room.memory.tasks.needBuilding, 3);
        //Build before maintenance; we can move faster with more things if we build first, and it doesn't decay *that* fast.
        if(construction.length != 0) {
            var constructionSite = construction[0];
            // there is construction here, build it
            this.build(constructionSite);
        }
        else  {
            var maintenance = this.pos.findInRange(FIND_STRUCTURES, 3, {filter: (structure) => structure.needsMaintenance()});
            if(maintenance.length != 0) {
                //We already checked if this needs it.
                this.repair(maintenance[0]);
            }
        }
    }

Creep.prototype.workerMove = function() {
    var target = Game.getObjectById(this.memory.target);
    //Try operation
    var result = this.modeOperation(target);
    if(result == OK) {
        return;
    }
    // if(!target) {
    //     console.log(this.name, 'tried to', this.memory.mode, 'with target', this.memory.target, target, result);
    // }
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
    //Look for repair/build/reclaim targets of opportunity if failed
    if(result != OK && this.carry.energy > 70) {
        // console.log('>>', this.name, 'going for local maintenance', this.pos);
        this.localMaintenance();
    }
}

Creep.prototype.initMode = function(mode, target) {
    this.memory.mode = mode;
    switch(mode) {
        case 'harvest':
            this.selectSource();
            break;
        case 'upgrade':
            this.registerUpgrading();
            break;
        default:
            this.memory.target = target;
            break;
    }
};

Creep.prototype.clearMode = function() {
    switch(this.memory.mode) {
        case 'harvest':
            this.unregisterGathering();
            break;
        case 'upgrade':
            this.unregisterUpgrading();
            break;
        default:
            // console.log(this.name, 'deleting target', this.memory.target);
            delete this.memory.target;
            break;
    }
};

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
