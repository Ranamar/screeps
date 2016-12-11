Structure.prototype.needsEnergy = function() {
    return (this.structureType == STRUCTURE_EXTENSION ||
            this.structureType == STRUCTURE_SPAWN ||
            this.structureType == STRUCTURE_LINK ||
            this.structureType == STRUCTURE_TOWER)
            && this.energy < this.energyCapacity;
}

//XXX magic numbers
StructureLink.prototype.pullEnergy = function() {
    console.log(this, 'pulling energy', this.energy);
    if(this.energy > 400) {
        return;
    }
    let links = this.room.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_LINK});
    for(let i = 0; i < links; i++) {
        let link = links[i];
        if(link.energy > 400) {
            let result = link.transferEnergy(this, 400);
            if(result == OK) {
                return;
            }
        }
    }
}