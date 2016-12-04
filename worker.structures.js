var lodash = require('lodash');

Creep.prototype.registerUpgrading = function() {
    // console.log(this.name, 'supposed to register with upgrading list');
    if(!this.room.memory.upgraders.includes(this.name)) {
        this.room.memory.upgraders.push(this.name);
        // console.log(this.name, 'registered with upgrading list');
    }
    this.memory.target = this.room.controller.id;
}

Creep.prototype.unregisterUpgrading = function() {
    // console.log(this.name, 'unregistering from upgrade list');
    lodash.pull(this.room.memory.upgraders, this.name);
}