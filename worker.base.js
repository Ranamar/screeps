var builder = require('role.builder');
var harvester = require('role.harvester');
var store = require('role.store');
var upgrader = require('role.upgrader');

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
        // console.log(creep.name, 'setting mode to current mode', newMode);
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
    if(!result) {
        // console.log(creep.name, 'mode', creep.memory.mode, 'failed to do anything', result);
        this.setMode('unassigned');
    }

    if(this.memory.mode != 'harvest' && this.carry.energy < 20 ||
        this.memory.mode == 'harvest' && this.carry.energy == this.carryCapacity) {
        this.setMode('unassigned');
    }
}

Creep.prototype.assignJob = function(job) {
    this.setMode(job.job);
    this.memory.target = job.target;
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

Creep.prototype.workerMove = function() {
    //Try operation
    //move if fail
    //try operation again
    //look for targets of opportunity if failed
}
