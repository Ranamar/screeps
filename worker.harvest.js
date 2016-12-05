var lodash = require('lodash');

Creep.prototype.selectSource = function() {
    var sources = this.room.memory.energySources;
    if(this.memory.target == undefined) {
        var leastIndex = 0;
        var leastCount = Number.MAX_VALUE;
        var source = null;
        for(var i = 0; i < sources.length; i++) {
            source = Game.getObjectById(sources[i].id);
            if(sources[i].miners.length <= leastCount && source.energy > 0) {
                leastIndex = i;
                leastCount = sources[i].miners.length;
            }
        }
        this.memory.targetIndex = leastIndex;
        sources[leastIndex].miners.push(this.name);
        this.memory.target = sources[leastIndex].id;
        // console.log(this.name, 'selected harvest target', this.memory.targetIndex, this.memory.target);
    }
    // else {
    //     console.log(this.name, 'already has harvest target', this.memory.targetIndex, this.memory.target);
    // }
};

Creep.prototype.unregisterGathering = function() {
    var targetIndex = this.memory.targetIndex;
    if(targetIndex != undefined) {
        // console.log(this.name, 'unregistering from gathering');
        var source = this.room.memory.energySources[targetIndex];
        lodash.pull(source.miners, this.name);
        delete this.memory.targetIndex;
        delete this.memory.target;
    }
};

Creep.prototype.gatherEnergy = function(target) {
    if(this.carry.energy < this.carryCapacity) {
        var result = this.harvest(target);
        if(result == ERR_NOT_ENOUGH_RESOURCES) {
            this.room.memory.noEnergy = true;
            //select new source?
        }
        else if(result == ERR_NOT_IN_RANGE || result == OK) {
            this.room.memory.noEnergy = false;
        }
        return result;
    }
    else {
        return ERR_FULL;
    }
}
