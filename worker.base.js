var harvester = require('worker.harvest');
var resource = require('worker.resources');
var maintenance = require('structures.maintenance');
var upgrading = require('worker.upgrade');

var experimental = require('worker.experimental');

var analytics = require('analytics');
var dispatcher = require('dispatcher');

Creep.prototype.workerInit = function() {
    switch(this.role) {
        default:
            experimental.initExperimental(this);
            break;
    }
}

Creep.prototype.assignJob = function(job) {
    // console.log(this.name, 'assigning job', job.job, job.target);
    if(!job) {
        console.log(this.name, 'assigned no job; bailing out');
        this.transitionMode('unassigned');
        return;
    }
    this.transitionMode(job.job, job.target);
}

Creep.prototype.transitionMode = function(newMode, newTarget) {
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
    if(this.room.memory.tasks) {
        var construction = this.pos.findInRange(this.room.memory.tasks.needBuilding, 3);
        //Build before maintenance; we can move faster with more things if we build first, and it doesn't decay *that* fast.
        if(construction.length != 0) {
            var constructionSite = construction[0];
            // there is construction here, build it
            this.build(constructionSite);
        }
        else  {
            var maintenance = this.pos.findInRange(this.room.memory.tasks.needMaintenance, 3, {filter: (structure) => structure.needsMaintenance()});
            if(maintenance.length != 0) {
                //We already checked if this needs it.
                this.repair(maintenance[0]);
            }
        }
        var looseResource = this.pos.findInRange(this.room.memory.tasks.resources, 1);
        if(looseResource.length > 0) {
            this.pickup(looseResource[0]);
        }
    }
    //do differently if we haven't done a dispatch scan?
}

Creep.prototype.findJob = function() {
    var job = dispatcher.assignJob(this);
    this.assignJob(job);
}

Creep.prototype.work = function() {
    var target = Game.getObjectById(this.memory.target);
    //Try operation
    var result = this.modeOperation(target);
    if(result == OK) {
        return;
    }
    if(result == ERR_FULL ||
        result == ERR_NOT_ENOUGH_RESOURCES ||
        result == ERR_INVALID_TARGET ||
        result == ERR_NO_BODYPART) {
        // console.log(this.name, 'tried to', this.memory.mode, 'with target', this.memory.target, target, result);
        //No capacity to do this job - find something else to do.
        this.findJob();
        result = this.modeOperation(target);
    }
    //move if out of range
    if(result == ERR_NOT_IN_RANGE) {
        this.loggedMove(target);
    }
    //Handle other error cases
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
        this.loggedMove(target);
    }
}
