var analytics = require('analytics');

// 30 per 1000 is about how many part-steps are required for a road on plains to be worth maintaining.
// 150 per 1000 is about how many part-steps are required for a road on swamp to be worth maintaining.
// The math is the same as for building it except with 50 instead of 300 and 250 instead of 1500 for road costs.
const road_cost = 250; //This is the cost to repair a built swamp road from 0
const road_life = 50000;
const creep_life = 1500;
const part_cost = 50;
const MIN_VALUABLE_ROAD_SCORE = (road_cost*5/4)*(analytics.sampleSpan*analytics.sampleCount/road_life)*(creep_life/part_cost);

const WALL_TARGET_STRENGTH = 750000;
const MIN_DAMAGE_TO_REPAIR = 800;

Structure.prototype.needsRepairs = function() {
    return (this.hits < (this.targetHP() - MIN_DAMAGE_TO_REPAIR));
};

StructureRoad.prototype.needsRepairs = function() {
    let dynamicScore = analytics.getWalkScore(this.pos) > MIN_VALUABLE_ROAD_SCORE;
    return (this.hits < (this.hitsMax - MIN_DAMAGE_TO_REPAIR)) && dynamicScore;
};

Structure.prototype.targetHP = function() {
    return this.hitsMax;
}

StructureWall.prototype.targetHP = function() {
    return WALL_TARGET_STRENGTH;
}

StructureRampart.prototype.targetHP = function() {
    return WALL_TARGET_STRENGTH;
}

//This pings if a short-range heal from a tower will put it near max health.
Structure.prototype.needsMaintenance = function() {
    let damage = this.targetHP() - this.hits;
    return (damage >= MIN_DAMAGE_TO_REPAIR) && (damage < MIN_DAMAGE_TO_REPAIR*2);
};

StructureRampart.prototype.needsMaintenance = function() {
    let damage = this.targetHP() - this.hits;
    //For ramparts, we have towers put the first slug of HP into it so it doesn't accidentally decay.
    return (damage >= MIN_DAMAGE_TO_REPAIR) && (damage < MIN_DAMAGE_TO_REPAIR*2) || (this.hits < MIN_DAMAGE_TO_REPAIR);
};

StructureRoad.prototype.needsMaintenance = function() {
    var dynamicScore = true;
    dynamicScore = analytics.getWalkScore(this.pos) > MIN_VALUABLE_ROAD_SCORE;
    let damage = this.hitsMax - this.hits;
    return (damage > MIN_DAMAGE_TO_REPAIR) && (damage < MIN_DAMAGE_TO_REPAIR*2) && dynamicScore;
};

Creep.prototype.checkedRepair = function(repTarget) {
    if(!(repTarget instanceof Structure)) {
        console.log('got invalid repair target', repTarget);
        return ERR_INVALID_TARGET;
    }
    // console.log(this.name, 'repairing', repTarget, repTarget.pos, repTarget.hits, repTarget.hitsMax);
    if(!(repTarget.needsRepairs())) {
        // console.log(repTarget, "doesn't need repairs");
        //repair never returns this, so we can overload this return value.
        return ERR_FULL;
    }
    var attempt = this.repair(repTarget);
    // console.log('repair attempt', attempt);
    return attempt;
}
