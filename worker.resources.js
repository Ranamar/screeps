Creep.prototype.storeEnergy = function(target) {
    return this.transfer(target, RESOURCE_ENERGY);
}

Creep.prototype.storeAny = function(target) {
    for(let resource in this.carry) {
        if(this.carry[resource] > 0) {
            return this.transfer(target, resource);
        }
    }
}