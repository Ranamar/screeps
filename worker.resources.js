Creep.prototype.storeEnergy = function(target) {
    return this.transfer(target, RESOURCE_ENERGY);
}

Creep.prototype.storeAny = function(target) {
    for(let resource in this.carry) {
        if(this.carry[resource] > 0) {
            return this.transfer(target, resource);
        }
    }
    //We don't have any resources to store
    return ERR_NOT_ENOUGH_RESOURCES;
}