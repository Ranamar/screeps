var lodash = require('lodash');

Creep.prototype.registerUpgrading = function() {
    if(!this.room.memory.upgraders.includes(this.name)) {
        this.room.memory.upgraders.push(this.name);
    }
    this.memory.target = this.room.controller.id;
}

Creep.prototype.unregisterUpgrading = function() {
    lodash.pull(this.room.memory.upgraders, this.name);
}