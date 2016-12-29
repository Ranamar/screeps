var harvester = require('worker.harvest');
var resource = require('worker.resources');
var maintenance = require('structure.maintenance');
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
        case 'build':
            return this.build(target);
        case 'store':
            return this.storeEnergy(target);
        case 'storeall':
            return this.storeAny(target);
        case 'upgrade':
            return this.upgradeController(this.room.controller);
        case 'repair':
            return this.checkedRepair(target);
        case 'pickup':
            return this.pickup(target);
        case 'getenergy':
            return this.withdraw(target, RESOURCE_ENERGY);
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
    if(this.memory.mode == 'harvest') {
        let target = Game.getObjectById(this.memory.target);
        if(target.energy == 0 && this.room.storage.store.energy > 0) {
            let job = {
                job: 'getenergy',
                target: this.room.storage.id
            };
            // console.log(this.name, job.job, job.target, this.room.storage);
            this.assignJob(job);
            return;
        }
    }
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
        //No capacity to do this job - find something else to do.
        this.findJob();
        //Don't forget to retarget for this function
        target = Game.getObjectById(this.memory.target);
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
            console.log(this.name, 'init mode', mode, target);
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
        //XXX danger: only works with workers
        this.work();
    }
    else {
        var target = Game.rooms[this.memory.destination].controller;
        this.loggedMove(target);
    }
}
