Creep.prototype.mine = function() {
    var mineralList = this.room.find(FIND_MINERALS);
    if(mineralList) {
        var target = mineralList[0];
        if(this.memory.storing && !this.carry[target.mineralType]) {
            this.memory.storing = false;
            this.say('mining');
        }
        if(!this.memory.storing && this.carry[target.mineralType] == this.carryCapacity) {
            this.memory.storing = true;
            this.say('storing');
        }
        var result = -1;
        if(this.memory.storing) {
            target = this.room.storage;
            result = this.storeAny(target);
        }
        else {
            result = this.harvest(target);
        }
        if(result != OK) {
            this.moveTo(target);
        }
    }
    else {
        console.log(this.name, this.pos, "can't find minerals");
    }
}

Room.prototype.checkMiner = function() {
    let minerals = this.find(FIND_MINERALS);
    if(!minerals.length) {
        return;
    }
    let mineral = minerals[0];
    //Minerals aren't walkable, so if there's a structure on the mineral, it's an extractor.
    let extractors = this.lookForAt(LOOK_STRUCTURES, mineral);
    if(!extractors.length) {
        this.createConstructionSite(mineral, STRUCTURE_EXTRACTOR);
        return;
    }
    if(this.memory.miner && !(this.memory.miner in Game.creeps)) {
        delete this.memory.miner;
    }
    if(!this.memory.miner && mineral.mineralAmount > 0) {
        this.memory.needsMiner = true;
    }
}
