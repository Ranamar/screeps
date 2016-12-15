StructureTower.prototype.autoFire = function() {
    let target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(target != undefined) {
        this.attack(target);
    }
    else {
        let repairTargets = [];
        //The only reason we can afford to do this often is because we cache out the results of the find() call at the start of the tick.
        if(this.room.memory.tasks && this.room.memory.tasks.needMaintenance) {
            //This has already been filtered by the dispatcher.
            repairTargets = this.pos.findInRange(this.room.memory.tasks.needMaintenance, 10);
            // console.log(this.pos, repairTargets, repairTargets[0]);
        }
        else {
            repairTargets = this.pos.findInRange(FIND_STRUCTURES, 10, { filter: (structure) => structure.needsMaintenance() });
        }
        if (repairTargets[0] != undefined) {
            this.repair(repairTargets[0]);
        }
        //XXX else heal? costs energy, though I suppose spawning a healer does too.
        else {
            let healTarget = this.pos.findClosestByRange(FIND_MY_CREEPS, {filter: (creep) => creep.hits < creep.hitsMax});
            if(healTarget) {
                this.heal(healTarget);
            }
        }
    }
};
    
var towerFirer = {
    fire: function(roomName) {
        var towers = Game.rooms[roomName].find(FIND_MY_STRUCTURES,
                            { filter: {'structureType': STRUCTURE_TOWER} });
        for (let tower of towers) {
            tower.autoFire();
        }
    }
}

module.exports = towerFirer;