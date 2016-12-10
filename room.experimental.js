var lodash = require('lodash');

var isWalkable = function(squareTerrain) {
    return squareTerrain.terrain != 'wall';
}

var adjacentInOtherList = function(item, list) {
    let x = item.x;
    let y = item.y;
    for(let i = 0; i < list.length; i++) {
        if(list[i].x >= x-1 && list[i].x <= x+1 && list[i].y >= y-1 && list[i].y <= y+1) {
            return true;
        }
    }
    return false;
}

function scoreTiles(tileArray) {
    let counts = lodash.countBy(tileArray, 'terrain');
    let plains = counts['plain'] || 0;
    let swamp = counts['swamp'] || 0;
    return plains + swamp;
}

var scoreLocationAccess = function(best, current) {
    if(!best) return current;
    let bestAdjacent = this.lookForAtArea(LOOK_TERRAIN, best.y - 1, best.x - 1, best.y + 1, best.x + 1, true);
    let newAdjacent = this.lookForAtArea(LOOK_TERRAIN, current.y - 1, current.x - 1, current.y + 1, current.x + 1, true);
    if(scoreTiles(bestAdjacent) < scoreTiles(newAdjacent)) {
        return current;
    }
    else {
        return best;
    }
}

Room.prototype.flagUpgrades = function() {
    let controller = this.controller;
    let withinThree = lodash.filter(this.lookForAtArea(LOOK_TERRAIN, controller.pos.y - 3, controller.pos.x - 3, controller.pos.y + 3, controller.pos.x + 3, true),
                                            isWalkable);
    for(let j = 0; j < withinThree.length; j++) {
        this.createFlag(withinThree[j].x, withinThree[j].y, null, COLOR_YELLOW);
    }
    let topScoreLocation = lodash.reduce(withinThree, scoreLocationAccess, null, this);
    this.createFlag(topScoreLocation.x, topScoreLocation.y, null, COLOR_GREEN);
}

Room.prototype.flagSources = function() {
    let sources = this.find(FIND_SOURCES);
    for(let i = 0; i < sources.length; i++) {
        let source = sources[i];
        let oneAwayWalkable = lodash.filter(this.lookForAtArea(LOOK_TERRAIN, source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true),
                                            isWalkable);
        let twoAway = [];
        //top
        twoAway.push(this.lookForAtArea(LOOK_TERRAIN, source.pos.y - 2, source.pos.x + 2, source.pos.y + 2, source.pos.x + 2, true));
        //left
        twoAway.push(this.lookForAtArea(LOOK_TERRAIN, source.pos.y - 2, source.pos.x - 1, source.pos.y - 2, source.pos.x + 1, true));
        //right
        twoAway.push(this.lookForAtArea(LOOK_TERRAIN, source.pos.y + 2, source.pos.x - 1, source.pos.y + 2, source.pos.x + 1, true));
        //bottom
        twoAway.push(this.lookForAtArea(LOOK_TERRAIN, source.pos.y - 2, source.pos.x - 2, source.pos.y + 2, source.pos.x - 2, true));
        twoAway = lodash.flatten(twoAway);
        let twoAwayWalkable = lodash.filter(twoAway, (item) => isWalkable(item) && adjacentInOtherList(item, oneAwayWalkable));
        for(let j = 0; j < twoAwayWalkable.length; j++) {
            this.createFlag(twoAwayWalkable[j].x, twoAwayWalkable[j].y, null, COLOR_BLUE);
        }
        for(let j = 0; j < oneAwayWalkable.length; j++) {
            this.createFlag(oneAwayWalkable[j].x, oneAwayWalkable[j].y);
        }
        this.createFlag(source.pos.x, source.pos.y, null, COLOR_RED);
        
        let topScoreLocation = lodash.reduce(twoAwayWalkable, scoreLocationAccess, null, this);
        this.createFlag(topScoreLocation.x, topScoreLocation.y, null, COLOR_GREEN);
    }
}

Room.prototype.deleteAllFlags = function() {
    let flags = this.find(FIND_FLAGS);
    for(let i = 0; i < flags.length; i++) {
        flags[i].remove();
    }
}