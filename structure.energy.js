Structure.prototype.needsEnergy = function() {
    return (this.structureType == STRUCTURE_EXTENSION ||
            this.structureType == STRUCTURE_SPAWN ||
            //this.structureType == STRUCTURE_LINK ||
            this.structureType == STRUCTURE_TOWER)
            && this.energy < this.energyCapacity;
}

//XXX magic numbers
StructureLink.prototype.pullEnergy = function() {
    if(this.energy > 400 || this.cooldown > 0) {
        return;
    }
    let links = this.room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_LINK});
    for(let i = 0; i < links.length; i++) {
        let link = links[i];
        if(link.energy > 400) {
            let result = link.transferEnergy(this, 400);
            if(result == OK) {
                return;
            }
        }
    }
}

StructureLink.prototype.pushEnergy = function() {
    if(this.cooldown > 0) {
        return;
    }
    // console.log('>> pushing energy from', this, this.pos);
    let targetId = this.room.memory.upgradeLink;
    if(!targetId) {
        console.log('>> Did not find upgrade link');
        let links = this.room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_LINK});
        for(let i = 0; i < links.length; i++) {
            let link = links[i];
            if(link.energy < 600) {
                let result = this.transferEnergy(link);
                if(result == OK) {
                    return;
                }
            }
        }
    }
    else {
        let target = Game.getObjectById(targetId);
        this.transferEnergy(target);
    }
}
