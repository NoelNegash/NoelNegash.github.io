const NOTHING = "nothing"
const TREE = "tree"
const EMPTY = "empty"
const WHEAT = "wheat"
const APPLE = "apple"
const CUCUMBER = "cumcumber"
const WOOD = "wood"
const PLOT = "plot"
const WATERING_CAN = "watering can"


const MENU = "menu"
const GAME = "game"
const CREDITS = "credits"
const INSTRUCTIONS = "instructions"

const gravity = 0.1

var damageSoundProb = 0.6
var reverseAudioMap

const harvestingCost = 2
const choppingCost = 5
const plantingCost = 2
const wateringCost = 1


const selectionRadius = 4

const choppingCount = 100
const harvestingCount = 30
const progressBarHeight = 30
const progressBarWidth = 100
const progressBarOutline = 2
const types= {
  "0":NOTHING,
  "1":EMPTY,
  "2":TREE,
  "3":PLOT,
  "4":"",
  "5":"",
  "6":"",
}
const typeToTileMap= {
  [EMPTY]: EmptyTile,
  [TREE]: TreeTile,
  [PLOT]: PlotTile
}
const planteable = {
  [APPLE]:true,
  [WHEAT]:true,
  [CUCUMBER]:true

}
const edible = {
  [APPLE]:[3,3],
  [CUCUMBER]:[-15,-20]
}

const screenWidth = 1368//window.innerWidth//1368
const screenHeight = 912//window.innerHeight//912
const tileHeight = 100;


const cullingDistance = Math.sqrt((screenWidth/2)**2+(screenHeight/2)**2) + tileHeight*2


var character;
const characterSpeed = 3;

const cameraSmoothing = 0.1

const keys = {}

const isometricOffset = 30;
const drawOffset = (90-isometricOffset)/2

const sinIso = Math.sin(isometricOffset*Math.PI/180);
const cosIso = Math.cos(isometricOffset*Math.PI/180);

const sinOff = Math.sin(drawOffset*Math.PI/180);
const cosOff = Math.cos(drawOffset*Math.PI/180);

const inventoryTileSize = 50
const inventoryTileSpacing = 5

const plantShootLife = 600
const wateringTime = 300
const plantStemLife = 800

const statusBarHeight = 20;
const statusBarWidth = 400;
const statusBarSeparator = 5;

const maxCharacterHealth = 100
const maxCharacterStrength = 100

const selectionMenuSize = 30
const selectionMenuSpacing = 5 

/* consts */

var cactusImg, snakePlantImg, pokeWeedImg
var charFrontBody, charBackBody, charFrontHead, charBackHead, charRightHand, charLeftHand

var menuImg, creditsImg, instructionsImg

var backgroundTileImg

var audioEnded={}
var chopAudio, deathAudio, eatAudio, harvestAudio, damageAudio, healingAudio, walkingAudio
var mixGain

var soundtrackBars = []


/* images */
var inventory;
var eatButton
var damageParticleSystems = []
var soundtrack


var cameraX = 200;
var cameraY = 200;

var selectedTile;
var activity = undefined

var grid = ['000000000000',
            '000011100000',
            '000001210000',
            '000012210000',
            '000012010000',
            '000012210000',
            '000002000000',
            '000012200000',
            '000000000000']
var isDead = false
var isPaused = false
var scene = MENU
var drawnPaused = false

var menuPlayed = false

function newGame() {
  randomGrid()
  setupMap()
  scene = GAME
  isDead = false
  drawnPaused = false
  menuPlayed = false
}

function randomGrid() {
  var isDead = false
  grid = []
  for (var i = 0; i < 10; i++) {
    var s = ''
    for (var j = 0; j < 10; j++) {
      if(i == 9 && j == 9) s+='p'
      else s += '12'[Math.floor(Math.random()*2)]
    }
    grid.push(s)
  }
}

var tiles = []
var drops = []

var totalGameTime;
var gameStart;
var selectionMenu

function getGameTime() {
  return totalGameTime + (gameStart==undefined?0:(new Date() - gameStart))
}
function getFormattedGameTime() {
  var t = getGameTime()
  var s = floor(t/1000)
  var m = floor(s/60)
  var h = floor(m/60)
  s = s%60
  m = m%60

  var res = ""
  if (h<10) res+='0'
  res += h+':'
  if (m<10) res+='0' 
  res += m+':'
  if (s<10) res+='0' 
  res += s
  return res

}

// iso functions
function isoRotated(x,y, neg=1) {
  if (neg == 0) return [x,y]
  var d = dist(0,0,x,y)
  var a = atan2(y,x)
  return [cos(drawOffset*neg+a)*d, sin(drawOffset*neg+a)*d]
}
function hitsOriginIsoRect(x,y) {
  if (x > 0 && x < cosOff*tileHeight*2) {
    if (x < cosOff*tileHeight&& y > -cosOff*x && y < cosOff*x ) return true
    if (x > cosOff*tileHeight&& y >= cosOff*(x-cosOff*tileHeight)-cosOff*tileHeight && y <= -cosOff*(x-cosOff*tileHeight)+cosOff*tileHeight
       ) return true
  }
  return false
}
function hitsRect(x,y, rx,ry,w,h) {
  return x > rx && x < rx+w && y > ry && y < ry+h;
}
function hitsCircle(x,y,cx,cy,r) {
  return (dist(cx,cy,x,y)<r)
}
//helper functions
function replaceTile(x,y) {
  y.radiation = x.radiation
  y.radiationSpots = x.radiationSpots
  y.ii = x.ii
  y.jj = x.jj
  if (selectedTile==x) selectedTile = y
  if (character.tile==x) character.tile = y
  y.neighbors = x.neighbors
  y.z = x.z
  for (var i = 0; i < tiles.length; i++) {
    for (var j = 0; j < tiles[i].length; j++) {
      if (tiles[i][j] == x) {
        tiles[i][j] = y
      } else {
        for (var k = 0; k < tiles[i][j].neighbors.length; k++) {
          if (tiles[i][j].neighbors[k]==x) tiles[i][j].neighbors[k] = y
        }
      }
    }
  }
}

// draw functions
function drawCharacterStats(){
    push()
    translate(5,5);
      
    fill(255, 0, 0);
    rect(statusBarSeparator, 
         statusBarSeparator, 
         statusBarWidth*character.health/maxCharacterHealth, 
         statusBarHeight,
         20);
  
    fill(255, 255, 255);
    textAlign(CENTER, TOP);
    textSize(18);
    text(("HLT " + character.health), 
         statusBarSeparator, 
         statusBarSeparator*2, 
         statusBarWidth, 
         statusBarHeight);
    pop();
  
  
    push()
    translate(5,5);
  
    fill(0, 0, 255,);
    rect(statusBarSeparator, 
         statusBarSeparator + statusBarHeight + statusBarSeparator, 
         statusBarWidth*character.strength/maxCharacterStrength, 
         statusBarHeight,
         20);
  
    fill(255, 255, 255);
    textAlign(CENTER, TOP);
    textSize(18);
    text(("STR " + character.strength), 
         statusBarSeparator, 
         statusBarSeparator*2 + statusBarHeight + statusBarSeparator,
         statusBarWidth, 
         statusBarHeight);
    textAlign(LEFT,TOP)


    fill(30,180,190)
    rect(statusBarSeparator*1.2+statusBarWidth,statusBarSeparator, 82, 24, 10)
    fill(255)
    text(getFormattedGameTime(), statusBarSeparator*2+statusBarWidth, statusBarSeparator*2)
    
    pop();

}

function drawIsometricRect(x,y,w,h) {
  var offX = tileHeight*sinIso;
  var offY = tileHeight*cosIso;
  push()
  translate(x,y)
  rotate(-drawOffset)
  quad(0,0, 
       w,0, 
       offX+w,offY,
       offX,offY)
  pop()
}

function drawInventoryTile(x,y, itemData, hover, selected) {
  stroke(0)
  if (selected) strokeWeight(3)
  else if (hover) {
    stroke(100)
    strokeWeight(3)
  }
  else strokeWeight(1)
  fill(255,255,255,80)
  rect(x,y, inventoryTileSize, inventoryTileSize)
  fill(255,255,255)
  if (itemData) {
    push()
    translate(x,y)
    stroke(0)
    strokeWeight(1)
    drawFunctions[itemData.type]()
    if (itemData.number != undefined) {
      textAlign(CENTER,CENTER)
      textSize(32)
      text(itemData.number, inventoryTileSize/2, inventoryTileSize/2)
    }
    pop()
  }
}

var dropDrawFunctions = {}
dropDrawFunctions[APPLE] = function(){
  push()
  translate(this.x, this.y)
  rotate(this.angle)
  fill(230,30,10)
  ellipse(0,0, 20, 20)
  fill(0,230,10)
  triangle(4,6,8,4,8,10)
  pop()
}
dropDrawFunctions[CUCUMBER] = function (){
  push()
  translate(this.x,this.y)
  rotate(this.angle)
  fill(60,180,80)
  rect(-20,-5,40,10,6)
  ellipse(-10,0,5,5)
  ellipse(-15,3,5,5)
  ellipse(8,-4,5,5)
  ellipse(12,1,5,5)
  pop()
}
dropDrawFunctions[WOOD]= function () {
  push()
  translate(this.x, this.y)
  rotate(this.angle)
  fill(130,20,10)
  rect(-10,-3, 20, 6)
  pop()
}

var drawFunctions = {}
drawFunctions[APPLE] = () => {
  push()
  translate(inventoryTileSize/2,inventoryTileSize/2)
  rotate(180)
  scale(inventoryTileSize/25)
  fill(230,30,10)
  ellipse(0,0, 20, 20)
  fill(0,230,10)
  triangle(4,6,8,4,8,10)
  pop()
}
drawFunctions[CUCUMBER] = () => {
  push()
  translate(inventoryTileSize/2,inventoryTileSize/2)
  rotate(45)
  fill(60,180,80)
  rect(-20,-5,40,10,6)

  ellipse(-10,0,5,5)
  ellipse(-15,3,5,5)
  ellipse(8,-4,5,5)
  ellipse(12,1,5,5)
  pop()
}
drawFunctions[WHEAT] = () => {
  fill(0,255,0);
  rect(0, 0, inventoryTileSize, inventoryTileSize);
}
drawFunctions[WOOD] = () => {
  push()
  translate(13,0)
  rotate(45)
  fill(130,20,10)
  rect(7,7, 30, 9)
  pop()
}
drawFunctions[WATERING_CAN] = () => {
  fill(180,180,200)
  push()
  translate(4,7)
  rect(10,10,24,24)
  
  rotate(-30)
  rect(4,4,8,20)
  pop()
}

function Soundtrack() {
  this.started = false
  this.update = function(event) {
    if (!this.started&&event) {
      this.started = true
      for (var i = 0; i < soundtrackBars.length;i++) {
        soundtrackBars[i].onended(this.playNewBar)
      }
      soundtrackBars[4].play()
    }
  }
  this.playNewBar = function() {
    if (scene==GAME) {
      var i = min(character.health/maxCharacterHealth,character.strength/maxCharacterStrength)
      i = floor(random(5)*i)
      soundtrackBars[i].play()
    } else soundtrackBars[4].play()
  }
}

function Inventory() {
  this.numCells = 8
  this.cells = []
  this.selected = undefined;
  this.hover = undefined
  
  this.add = function(item) {
    var added = false
    for (var i = 0; i < this.numCells; i++) {
      if (this.cells[i] && this.cells[i].type == item[0]) {
        this.cells[i].number += item[1]
        added = true
        break
      }
    }
    if (!added) {
      for (var i = 0; i < this.numCells; i++) {
        if (this.cells[i] == undefined) {
          this.cells[i] = {type:item[0],number:item[1]}
          break
        }
      }
    }
  }
  this.decrease = function(i) {
    if (this.cells[i]) {
      this.cells[i].number--
      if (this.cells[i].number <= 0) {
        this.cells[i] = undefined
        if (this.selected==i) this.selected = undefined
      }

    }
  }
  this.checkSelected = function () {
    for (var i = 0; i < this.numCells; i++) {
      if(this.cells[i] != undefined && hitsRect(mouseX, 
                  mouseY,
                  i*(inventoryTileSize+inventoryTileSpacing)+10,
                  height -(inventoryTileSize+inventoryTileSpacing),
                  inventoryTileSize,
                  inventoryTileSize)){
        this.selected = (this.selected == undefined || this.selected != i) ? i : undefined
        break;
      }
    }
  }
  this.update = function() {
    this.hover = undefined
    for (var i = 0; i < this.numCells; i++) {
      if(hitsRect(mouseX, 
                  mouseY,
                  i*(inventoryTileSize+inventoryTileSpacing)+10,
                  height -(inventoryTileSize+inventoryTileSpacing),
                  inventoryTileSize,
                  inventoryTileSize)){
        this.hover = i
        break;
      }
    }
    
  }
  this.draw = function () {
    for (var i = 0; i < this.numCells; i++) {
      drawInventoryTile(i*(inventoryTileSize+inventoryTileSpacing)+ 10, height - (inventoryTileSize+inventoryTileSpacing), this.cells[i], i == this.hover, i == this.selected)
    }
  }
}

function EatButton() {
  this.x = screenWidth - (inventoryTileSize+inventoryTileSpacing)
  this.y = screenHeight - (inventoryTileSize+inventoryTileSpacing)
  this.w = inventoryTileSize
  this.h = inventoryTileSize
  this.handleClick = function() {
    if (inventory.selected != undefined && edible[inventory.cells[inventory.selected].type]) {
      playSound(eatAudio)
      character.eat(inventory.cells[inventory.selected].type)
      inventory.decrease(inventory.selected)
    }
  }
  this.draw = function() {
    push()
    stroke(0)
    strokeWeight(1)
    fill(255)

    translate(this.x, this.y)
    rect(0,0,this.w,this.h)

    fill(0)
    textSize(20)
    textAlign(CENTER,CENTER)
    text('EAT',this.w/2,this.h/2)

    pop()
  }
}
function SelectionMenu(x, y, options) {
  this.x = x
  this.y = y
  this.options = options
  // [ {callback, draw} ]

  this.draw = function() {
    var tx = (selectionMenuSpacing+selectionMenuSize)*(this.options.length)-selectionMenuSpacing
    x = this.x-x/2
    x += cameraX - width/2
    var ty = this.y + cameraY - height/2

    for (var i = 0; i < this.options.length; i++) {
      var tx = x + i*(selectionMenuSpacing+selectionMenuSize)
      var touched = hitsCircle(mouseX, mouseY, tx, ty) < selectionMenuSize

      fill(255,255,255, touched?40:70)
      ellipse(tx,ty, selectionMenuSize, selectionMenuSize)
      push()
      translate(tx,ty)
      this.options[i].draw()
      pop()
    }
  }
  this.handleClick = function() {
    var tx = (selectionMenuSpacing+selectionMenuSize)*(this.options.length)-selectionMenuSpacing
    x = this.x-x/2
    x += cameraX - width/2
    var ty = this.y + cameraY - height/2

    for (var i = 0; i < this.options.length; i++) {
      var tx = x + i*(selectionMenuSpacing+selectionMenuSize)
      var touched = hitsCircle(mouseX, mouseY, tx, ty) < selectionMenuSize
      //if this.options[i].draw()
    }
  }
}

function InventoryItem(type) {
  this.type = type
  this.draw = drawFunctions[type]
  
}
function Seed(type) {
  InventoryItem.call(this,type)
  this.isSeed = true
}
function GreenWheat(){
  Seed.call(this, WHEAT);
}
function Apple(){
  Seed.call(this, APPLE);
}
function Cucumber(){
  Seed.call(this, CUCUMBER);
}
function Wood(){
  InventoryType.call(this, WOOD)
}
 
    
function ChoppingActivity(tile) {
  this.tile = tile
  this.count = 0
  
  this.update = function() {
    
    var mx = (mouseX + cameraX - width/2)
    var my = (mouseY + cameraY - height/2)
    
    this.count++
    playSound(chopAudio)

    if (!mouseIsPressed || !this.tile.hitsPoint(mx, my)) {
      activity = undefined
    } else if (this.count > choppingCount) {
      var newTile = new EmptyTile(this.tile.x, this.tile.y)
      replaceTile(this.tile, newTile)
      //TODO: Add wood drops
      var numDrops = random(3)+1
      for (var i = 0; i < numDrops; i++)
        drops.push(new Drop(this.tile.x+cosOff*tileHeight, this.tile.y, [APPLE,CUCUMBER,WOOD][floor(random(3))]))
      activity = undefined

      character.strength -= choppingCost
      damageParticleSystems.push(new DamageParticleSystem(character.x, character.y, choppingCost))
    }
  }
  
  this.draw = function () {
    
    var p = this.count/choppingCount
    
    push()
    translate(this.tile.x+cosOff*tileHeight, this.tile.y)
    fill(0)
    rect(-progressBarWidth/2-progressBarOutline,
         -progressBarHeight/2-progressBarOutline,
         progressBarWidth+progressBarOutline*2,
         progressBarHeight+progressBarOutline*2, 10)
    fill(200,100,100)
    rect(-progressBarWidth/2,
         -progressBarHeight/2,
         progressBarWidth*p, 
         progressBarHeight, 10)
    pop()
    
  }
}     

    
function HarvestingActivity(tile) {
  this.tile = tile
  this.count = 0
  
  this.update = function() {
    
    var mx = (mouseX + cameraX - width/2)
    var my = (mouseY + cameraY - height/2)
    
    this.count++
    playSound(harvestAudio)
    
    if (!mouseIsPressed || !this.tile.hitsPoint(mx, my)) {
      activity = undefined
    } else if (this.count > harvestingCount) {
      var newTile = new EmptyTile(this.tile.x, this.tile.y)
      replaceTile(this.tile, newTile)
      
      var numDrops = random(5)+3
      for (var i = 0; i < numDrops; i++)
        drops.push(new Drop(this.tile.x+cosOff*tileHeight, this.tile.y, this.tile.plant.type))
      activity = undefined

      character.strength -= harvestingCost
      damageParticleSystems.push(new DamageParticleSystem(character.x, character.y, harvestingCost))

      console.log(tile.plant.type)
      if (tile.plant.type == CUCUMBER) {
        newTile.radiation = max(tile.radiation-round(random(10)),0)
        newTile.calculateRadiationSpots()
      }
    }
  }
  
  this.draw = function () {
    
    var p = this.count/harvestingCount
    
    push()
    translate(this.tile.x+cosOff*tileHeight, this.tile.y)
    fill(0)
    rect(-progressBarWidth/2-progressBarOutline,
         -progressBarHeight/2-progressBarOutline,
         progressBarWidth+progressBarOutline*2,
         progressBarHeight+progressBarOutline*2, 10)
    fill(200,100,100)
    rect(-progressBarWidth/2,
         -progressBarHeight/2,
         progressBarWidth*p, 
         progressBarHeight, 10)
    pop()
    
  }
}     
        

function Drop(x,y, type) {
  this.x = x
  this.y = y
  this.maxY = y
  this.angle = 0
  var angleDest = (180+random(-20,20))*floor(random(2)+1)*(random()>0.5?-1:1)
  var a = 90+random(-1,1)*30
  var aVel = random()*0.1+0.05
  var vel = random()*2+1
  this.xVel = cos(a)*vel
  this.yVel = -sin(a)*vel 
  
  this.type = type
  this.draw = dropDrawFunctions[type]
  this.update = function () {
    
    this.angle += (angleDest-this.angle)*aVel
    this.yVel += gravity
    
    this.xVel *= 0.93
    this.yVel *= 0.92
    
    this.x += this.xVel
    this.y += this.yVel
    
    if (this.y > this.maxY) {
      this.y = this.maxY
      this.yVel *= -1
    }
    
    if (dist(this.x, this.y, character.x, character.y) < 25 ) {
      inventory.add([this.type,1])
      return true
    }  
  }
  
  
}
    
// tiles
function Tile(x,y, type) {
  
  this.calculateRadiationSpots = function() {
    this.radiationSpots = []
    if (this.radiation==0) return
    for (var i = 0; i <= floor(this.radiation/10); i++) {
      if (random()>0.5) {
        var randX = random()*cosOff*tileHeight
        this.radiationSpots.push([randX,random(-1,1)*randX*cosOff])
      } else {
        var randX = random()*cosOff*tileHeight
        this.radiationSpots.push([randX,random(-1,1)*(cosOff*tileHeight-randX)*cosOff])
      }
    }
  }

  this.radiation = floor(random(100))
  this.calculateRadiationSpots()
  this.x = x;
  this.y = y;
  this.neighbors = []
  this.type = type;
  
  this.isTraversable = (this.type==EMPTY||this.type==PLOT)
  
  

  this.hitsPoint = function(x,y) {
    return hitsOriginIsoRect(x-this.x,y-this.y)
  }
  
  this.update = function () {}
  this.handleClick = function() {

  }

   this.drawTile = function({
    tileColor= {r: 0, g: 0, b: 0},  
    drawDecor = () =>{}
  }){
    this.drawDecor = drawDecor
    
    var occluded = this.z > character.tile.z && 
        dist(this.x, this.y, character.tile.x, character.tile.y) < tileHeight*5
    var opacity = occluded ? 0.25 : 1
    opacity *= 255
  
    push()
    translate(this.x, this.y)    

    stroke(0)
    strokeWeight(1)
    fill(tileColor.r, tileColor.g, tileColor.b, tileColor.a);
    drawIsometricRect(0,0,tileHeight,tileHeight); 
    if (this == selectedTile) {
      noStroke()
      fill(255,0,0,40)
      drawIsometricRect(0,0,tileHeight,tileHeight); 
    }
    
    stroke(0,0,0,opacity)
    var center = [tileHeight*cos(drawOffset), 0];

    noStroke()
    fill(0,255,0)
    for(var i = 0; i < this.radiationSpots.length; i++) {
      var p = this.radiationSpots[i]
      triangle(p[0],p[1],p[0]+3,p[1]-2,p[0]+6,p[1])
    }

    translate(center[0], 0);
    //drawDecor({opacity});
    
    pop()
  }
  this.drawFeatures = function() {
    push()

    var center = [tileHeight*cosOff, 0];
    translate(this.x, this.y)
    translate(center[0], 0);

    var occluded = this.z > character.tile.z && 
        dist(this.x, this.y, character.tile.x, character.tile.y) < tileHeight*5
    var opacity = occluded ? 0.25 : 1
    opacity *= 255
    //tint(255,opacity)
    this.drawDecor({opacity});    
    pop()
    if (character.tile == this) character.draw()
  }
  this.draw = function () {
    this.drawTile({
      tileColor: {r:100, g:0,b:100},
    });
  }
}
function TreeTile(x,y) {
  Tile.call(this,x,y,TREE)
  this.img = [cactusImg,pokeWeedImg,snakePlantImg][floor(random(3))]
  this.ps = []
  var pss = random(3)+1
  if (this.img==cactusImg){
    pss=1
  }
  for (var i = 0; i < pss; i++) {
    this.ps.push([random(360), random(1)+1.5, random(0.2)+0.8, random(360), random(tileHeight/3), this.img==cactusImg?5:10])
  }
  if (this.img==cactusImg){
  }
  this.update = function () {
    if (this == selectedTile) {
      if (inventory.selected == undefined && activity == undefined && mouseIsPressed) {
        activity = new ChoppingActivity(this)
      } 
    }
  }
  
  this.draw = function (){
    this.drawTile({
      tileColor: {r:100, g:100,b:0},
      drawDecor: ({opacity}) => {
        /*fill(135, 20,10, opacity)
        rect(-10, -100 , 20, 100)
        fill(45,230,12,opacity)
        ellipse(0, -100, 60 + x%30, 30)*/
        
        for (var i = 0; i < this.ps.length; i++) {
          var p = this.ps[i]
          p[0]+=p[1]
          push()
          translate(cos(p[3])*p[4], sin(p[3])*p[4])
          rotate(sin(p[0])*p[5])
          scale(p[2])
          //if (opacity != 255) tint(255, opacity)
          image(this.img, -40, -200, 80, 200 )
          pop()
        }
       
      },
    })
  }
}    
function EmptyTile(x,y){
  Tile.call(this, x, y, EMPTY)
  this.draw = function (){
    this.drawTile({
      tileColor: {r:200, g:200,b:0},
    })
  }
  this.handleClick = function() {

    if (inventory.selected != undefined && planteable[inventory.cells[inventory.selected].type]) {

      character.strength -= plantingCost
      damageParticleSystems.push(new DamageParticleSystem(character.x, character.y, plantingCost))

      replaceTile(this, new PlotTile(this.x, this.y, inventory.cells[inventory.selected].type))
      inventory.decrease(inventory.selected)
    }
  }
}
function PlotTile(x,y, plant){
  Tile.call(this, x, y, PLOT)

  this.plant = new Plant(plant)

  this.update = function () {
    if (this == selectedTile) {
      if (activity == undefined && mouseIsPressed && this.plant.ripe) {
        activity = new HarvestingActivity(this)
      } 
    }
    this.plant.update()
  }
  this.draw = function (){
    this.drawTile({
      tileColor: {r:0, g:100,b:0},
      drawDecor: ({opacity}) => {
        if (this.plant.watered) {
          push()
          translate(-tileHeight*cos(drawOffset),0)
          noStroke()
          fill(0,0,40,90)
          drawIsometricRect(0,0,tileHeight,tileHeight);
          pop()
        }
        this.plant.draw(opacity)
      },
    })
  }
  this.handleClick = function() {
    if (inventory.selected != undefined && inventory.cells[inventory.selected].type == WATERING_CAN) {
      this.plant.water()
      character.strength -= wateringCost
      damageParticleSystems.push(new DamageParticleSystem(character.x, character.y, wateringCost))
    }
  }
}

function Plant(type) {
  this.type = type
  this.watered = false
  this.state = ['shoot', plantShootLife]

  this.update = function() {
    if (!this.ripe) {
      this.state[1]--;
      if (this.state[1] <= 0) {
        if (this.state[0] == 'shoot') {
          this.state = ['stem', plantStemLife]
        } else {
          this.ripe = true
        }
      }
    }
  }
  this.draw = function() {
    if (this.ripe) {
      drawFunctions[type]()
    } else if (this.state[0]=='shoot'){
      fill(0,255,0)
      rect(-5,-20, 10, 20)
    } else {
      push()
      rotate(-45)
      fill(0,255,0)
      rect(-5,-30, 10, 30)

      rotate(90)
      fill(0,255,0)
      rect(-5,-30, 10, 30)
      pop()
    }
  }
  this.water = function() {
    if (!this.watered) {
      this.watered = true
      this.state[1] -= wateringTime;
    }
  }
}

function Character(x,y) {
  this.x = x
  this.y = y

  this.xVelLast = 1
  this.yVelLast = 1

  this.health = maxCharacterHealth
  this.strength = maxCharacterStrength

  this.eat = function(type) {
    this.health = constrain(this.health+edible[type][0], 0, maxCharacterHealth)
    this.strength = constrain(this.health+edible[type][1], 0, maxCharacterStrength)
  }
  this.harm = function(pts){
    this.health -= pts;
  }
  this.tire = function(pts){
    this.strength -= pts;
  }

  this.update = function() {
    var xVel = 0, yVel = 0
    var keyKeys = {ArrowUp:[1,-1],ArrowLeft:[-1,-1],ArrowDown:[-1,1],ArrowRight:[1,1]}
    var alternative={ArrowUp:'KeyW',ArrowLeft:'KeyA',ArrowDown:'KeyS',ArrowRight:'KeyD'}
    for (k in keyKeys) {
      if (keys[k] || keys[alternative[k]]) {
        xVel += keyKeys[k][0]*cosOff*characterSpeed
        yVel += keyKeys[k][1]*sinOff*characterSpeed
      }
    }
    
    if (xVel != 0) this.xVelLast = xVel/abs(xVel)
    if (yVel != 0) this.yVelLast = yVel/abs(yVel)

    this.walking = abs(xVel) > 0 || abs(yVel) > 0
    if(this.walking) {
      playSound(walkingAudio)
    } else {
      walkingAudio.stop()
      audioEnded.walkingAudio = true
    }
    var newX = this.x+xVel, newY = this.y+yVel
    var valid = this.tile.hitsPoint(newX, newY)
    if (!valid) {
      for (var t = 0; t <  this.tile.neighbors.length; t++) {
        if (this.tile.neighbors[t].hitsPoint(newX, newY) &&
           this.tile.neighbors[t].isTraversable) {
          this.tile = this.tile.neighbors[t]
          valid = true;
          break;
        }
      }   
    }
    
    if (valid) {
      this.x += xVel
      this.y += yVel
    }

    if (random() < 1/60 && random(100) < this.tile.radiation) {
      var damage = ceil(random(this.tile.radiation/20))
      damageParticleSystems.push(new DamageParticleSystem(this.x, this.y, damage,[255,0,0]))
      this.health -= damage;
    }

  }
  this.draw = function() {
    push()
      translate(this.x, this.y)
      scale(abs(this.xVelLast)/this.xVelLast, 1)
      //shadow
      noStroke()
      fill(0,0,0,50)
      ellipse(0,5,50,20)
      var floatY = sin(frameCount*3.223234)*10-20
      translate(0,floatY)

      var armAngle = sin(frameCount*6.223234)*45
      if (!this.walking) armAngle = sin(frameCount*3.223234)*4-20
      var armSize = 20
      var armHeight = -20

      var left = this.xVelLast==1
      var back = this.yVelLast==-1

      //arm 1
      push()
        translate(0,armHeight)   
        rotate(armAngle)
        translate(0,armSize)
        rotate(armAngle/10 + 5)

        image(left?charLeftHand:charRightHand, 0, 0, 10,15)
      pop()

      push()
      scale(back?-1:1,1)
      // body
      stroke(0)
      fill(240,193,60)
      
      image(back?charBackBody:charFrontBody, -20, -35, 40,35)
      //ellipse(0,-20,40,35)
      pop()
      // arm2
      push()
        translate(0,armHeight)
        rotate(-armAngle)
        translate(0,armSize)
        rotate(-armAngle/10 - 5)
        
        image(!left?charLeftHand:charRightHand, 0, 0, 10,15)
      //ellipse(0,armSize, 10,15)
      pop()

      push()
      scale(back?-1:1,1)
      // head
      fill(100,10,255)
      image(back?charBackHead:charFrontHead, -12, -55, 25,25)
      //ellipse(0,-35,25,25)
      pop()

    pop()
  }
}

function DamageParticleSystem(x,y,damage,c=[0,0,255]) {
  this.x = x;
  this.y = y-50;
  this.damage = "-"+damage
  this.yVel = random()+1
  this.xVel = random(-1,1)*0.1
  this.opacity = 255
  this.opacityVel = random(4)+3


  if (c[0]==255 && random()<damageSoundProb) playSound(damageAudio)

  this.update = function() {
    this.x +=this.xVel
    this.y-=this.yVel
    this.opacity -= this.opacityVel
    return this.opacity < 0
  }
  this.draw = function() {
    noStroke()
    fill(c[0],c[1],c[2],this.opacity)
    textSize(18)
    textStyle(BOLD)
    text(this.damage, this.x, this.y)
    textStyle(NORMAL)
  }
}







function setupMap() {
  
  totalGameTime = 0
  gameStart = new Date()
  tiles = []
  drops = []
  damageParticleSystems = []


  var offX = tileHeight*sin(isometricOffset);
  var offY = tileHeight*cos(isometricOffset);
  
  var maxZ = grid.length+grid[0].length

  // populate grid
  for (var i = 0; i < grid.length; i++) {
    var row = grid[i]
    var gridRow = []
    for (var j = 0; j < row.length; j++) {



      var ch = row[j]
      var type = types[ch]
      if (ch == 'p') type = EMPTY
      if (ch == undefined) continue
      if (type != NOTHING) {
        const ctor = typeToTileMap[type];
        var pos = isoRotated(j*tileHeight - i*offX, i*offY);
        var x = pos[0], y = pos[1]// + j*offY/2
        gridRow.push(new ctor(x,y))
        if (ch=='p') {
          character = new Character(x+cosOff*tileHeight,y)
          character.tile = gridRow[gridRow.length-1]
        }
        gridRow[gridRow.length-1].z = i+j
        gridRow[gridRow.length-1].ii = i
        gridRow[gridRow.length-1].jj = j
      }

    }

    tiles.push(gridRow)
  }
  // neighbors
  for (var i = 0; i < grid.length; i++) {
    var row = tiles[i]
    for (var j = 0; j < row.length; j++) {

      tiles[i][j].ii = i
      tiles[i][j].jj = j


      for (var k = -1; k <= 1; k++) {
        for (var l = -1; l <=1 ; l++) {
          if ((l != 0 || k != 0) && i+k >=0 && i+k < tiles.length && j+l>=0 && j+l < tiles[i+k].length) {
            tiles[i][j].neighbors.push(tiles[i+k][j+l])
          }
        }
      }

    }
  }


  inventory = new Inventory()
  inventory.add([WATERING_CAN])
  inventory.add([APPLE, 10])
  
  eatButton = new EatButton()

}


function playSound(p) {
  var reverseAudioMap = {chopAudio:chopAudio,
                deathAudio:deathAudio,
                eatAudio:eatAudio,
                harvestAudio:harvestAudio,
                damageAudio:damageAudio,
                healingAudio:healingAudio,
                walkingAudio:walkingAudio}
  var a
  for (var i in reverseAudioMap) {
    if (reverseAudioMap[i]==p) a=i
  }
  if (audioEnded[a]) {
    p.play()
    audioEnded[a] = false
  }
}

function preload() {
  cactusImg = loadImage('assets/Cactus.png');
  pokeWeedImg = loadImage('assets/Poison Ivy.png');
  snakePlantImg = loadImage('assets/Pokeweed.png');

  backgroundTileImg = loadImage('assets/background_tile.png');

  charFrontBody = loadImage('assets/character/F Body.png')
  charBackBody = loadImage('assets/character/B Body.png')
  charFrontHead = loadImage('assets/character/F Head.png')
  charBackHead = loadImage('assets/character/B Head.png')
  charLeftHand = loadImage('assets/character/F L Hand.png')
  charRightHand = loadImage('assets/character/F R Hand.png')


  chopAudio = loadSound('assets/audio/chop.wav')
  deathAudio = loadSound('assets/audio/death.wav')
  eatAudio = loadSound('assets/audio/eat.wav')
  harvestAudio = loadSound('assets/audio/harvest.wav')
  damageAudio = loadSound('assets/audio/damage.wav')
  healingAudio = loadSound('assets/audio/recharge-health.wav')
  walkingAudio = loadSound('assets/audio/walking.wav')

  soundtrackBars.push(loadSound('assets/audio/ost/alien_d.mp3'))
  soundtrackBars.push(loadSound('assets/audio/ost/alien.mp3'))
  soundtrackBars.push(loadSound('assets/audio/ost/alien-c.mp3'))
  soundtrackBars.push(loadSound('assets/audio/ost/alien-cal.mp3'))
  soundtrackBars.push(loadSound('assets/audio/ost/alien-calm.mp3'))

  var audios = ['chopAudio','deathAudio','eatAudio','harvestAudio','damageAudio','healingAudio','walkingAudio']

  for (var i = 0; i < audios.length; i++) audioEnded[audios[i]] = true

  chopAudio.onended(() => {audioEnded.chopAudio = true})
  deathAudio.onended(() => {audioEnded.deathAudio = true})
  eatAudio.onended(() => {audioEnded.eatAudio = true})
  harvestAudio.onended(() => {audioEnded.harvestAudio = true})
  damageAudio.onended(() => {audioEnded.damageAudio = true})
  healingAudio.onended(() => {audioEnded.healingAudio = true})
  walkingAudio.onended(() => {audioEnded.walkingAudio = true})


  walkingAudio.rate(0.5)
}

function setup() {


  menuImg = createVideo('assets/menu_page.mp4');
  creditsImg = createVideo('assets/credits_page.mp4');
  instructionsImg = createVideo('assets/instruction_page.mp4');
  menuImg.hide()
  creditsImg.hide()
  instructionsImg.hide()

  soundtrack = new Soundtrack()

  angleMode(DEGREES);
  createCanvas(screenWidth, screenHeight);

}

function checkBackButton() {
  if (drawBackButton()) {
    scene = MENU
  }
}

function drawBackground() {
  var x = (screenWidth/2-menuImg.width/2)
  var y = (screenHeight/2-menuImg.height/2)

  while( x > 0) x-=menuImg.width
  while( y > 0) y-=menuImg.height

  while (x < screenWidth) {
    var ty = y
    while (ty < screenHeight) {
      image(backgroundTileImg,x,ty, menuImg.width, menuImg.height)

      ty += menuImg.height
    }
    x += menuImg.width
  }
}
function drawBackButton() {
  var x = screenWidth/2
  var y = screenHeight/2+menuImg.height/2
  var bounds = hitsCircle(mouseX, mouseY,x,y, 40)

  fill(255,255, 255, bounds?40:70)
  ellipse(x,y,40,40)
  return bounds
}


function drawMenu() {

  if (!menuPlayed || !menuImg.time()){
    menuPlayed = true
    menuImg.play()
  }
  drawBackground()

  image(menuImg, screenWidth/2-menuImg.width/2, screenHeight/2-menuImg.height/2)

  for (var i = 0; i < 3; i++) {
    var x = screenWidth/2-menuImg.width/3
    var y = screenHeight/2-menuImg.width/4 + i*menuImg.width/5
    if (menuPlayed && menuImg.time() > 0 && hitsRect(mouseX,mouseY, x, y, menuImg.width*2/3, menuImg.width/5)) {
      fill(255,255,255,40)
      rect(x,y, menuImg.width*2/3, menuImg.width/5, 10)
    }
  }
}

function drawCredits() {
  drawBackground()
  image(creditsImg, screenWidth/2-menuImg.width/2, screenHeight/2-menuImg.height/2)
  drawBackButton()
}
function drawInstructions() {

  drawBackground()
  image(instructionsImg,screenWidth/2-menuImg.width/2, screenHeight/2-menuImg.height/2)
  drawBackButton()
}

function drawGame() {  

  if (!isDead) {
    if (isPaused) {
      if (!drawnPaused) {
        drawnPaused = true
        background(0,0,0,50)
      }
      rect(screenWidth/2-100, screenHeight/2-200, 200, 400)
      textAlign(CENTER,CENTER)
      text("Game Paused\n\nPress 'P' to play", screenWidth/2, screenHeight/2-100)
    } else {
      background(50,80,10);
      push()
      
      cameraX += cameraSmoothing*(character.x-cameraX)
      cameraY += cameraSmoothing*(character.y-cameraY)
      
      translate(-cameraX+width/2,-cameraY+height/2)

      var mx = (mouseX + cameraX - width/2)
      var my = (mouseY + cameraY - height/2)
        
      // tile selection and drawing
      if (selectedTile && selectedTile.hitsPoint(mx,my) && abs(selectedTile.ii-character.tile.ii) < selectionRadius && abs(selectedTile.jj-character.tile.jj) < selectionRadius) {
        // do nothing
      } else {
        var sTile = selectedTile
        selectedTile = undefined
        for (var i = 0; i < tiles.length; i++) {
          for (var j = 0; j < tiles[i].length; j++) {
            var t = tiles[i][j]
            if (t.hitsPoint(mx,my) && abs(t.ii-character.tile.ii) < selectionRadius && abs(t.jj-character.tile.jj) < selectionRadius) {
              if (sTile != t) activity = undefined
              selectedTile = t
              break
            }
          }
        }
      }

      var zReach = ceil(screenHeight/(2*sinOff*tileHeight))+1
      var cz = character.tile.z - zReach;


      for (var z = cz; z <= character.tile.z+zReach+2; z++) {
        for (var i = 0; i < z; i++) {
          var j = z-i
          if (!tiles[i] || !tiles[i][j]) continue
          var t = tiles[i][j]
          if (abs((t.x+cosOff*tileHeight)-cameraX) > screenWidth/2+tileHeight) continue
          t.update()
          t.draw()
        }
      }
      for (var z = cz; z <= character.tile.z+zReach+2; z++) {
        for (var i = 0; i < z; i++) {
          var j = z-i
          if (!tiles[i] || !tiles[i][j]) continue
          var t = tiles[i][j]
          if (abs((t.x+cosOff*tileHeight)-cameraX) > screenWidth/2+tileHeight) continue
          t.drawFeatures()
        }
      }

      
      // fill(0,0,0, pow((sin(frameCount)+1)/2,1/3)*255 ) 
      // rect(0,0,width,height)
      
      var mx = mouseX + cameraX - width/2
      var my = mouseY + cameraY - height/2
        
      var rotMouse = [mx,my]//isoRotated(mx, my, -1)
      
      character.update()
        
      if (activity) activity.update()
      if (activity) activity.draw()
        
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i]
        var res = d.update()
        d.draw()
        if (res) {
          drops.splice(i,1)
          i--
        }
      }
      for (var i = 0; i < damageParticleSystems.length; i++) {
        var d = damageParticleSystems[i]
        var res = d.update()
        
        if (res) {
          damageParticleSystems.splice(i,1)
          i--
        } else d.draw()
      }
      

      pop()
        
      inventory.update()
      inventory.draw()

      eatButton.draw()


      if (inventory.selected != undefined) {
        var item = inventory.cells[inventory.selected]
        push()
        translate(mouseX-0.6*inventoryTileSize/2,mouseY-0.6*inventoryTileSize/2)
        scale(0.6)
        drawFunctions[item.type]()
        pop()
      }

      drawCharacterStats()

      isDead = character.strength <= 0 || character.health <= 0
      if (isDead) {
        if (gameStart) totalGameTime += new Date()-gameStart
        gameStart = undefined 
        playSound(deathAudio)
      }
    }
  } else {
    if (!drawnPaused) {
      drawnPaused = true
      background(0,0,0,50)
    }
    fill(255)
    rect(screenWidth/2-100, screenHeight/2-200, 200, 400)
    textAlign(CENTER,CENTER)
    fill(0)
    text("You died " + (character.health<=0 ? "in pain": "from exhaustion") + 
      ".\nYou stayed alive for "+getFormattedGameTime()+
      ".\n\nPress 'P' to play", screenWidth/2, screenHeight/2-100)
  }
}

function draw() {
  soundtrack.update()
  switch(scene) {
    case MENU:
      drawMenu()
      break;
    case GAME:
      drawGame();
      break;
    case INSTRUCTIONS:
      drawInstructions()
      break;
    case CREDITS:
      drawCredits()
      break
  }
}

function keyPressed(k) {
  keys[k.code] = true
  if (scene != GAME) {

  } else if (isDead && k.code=="KeyP") {
    newGame()
  } else if (!isDead && inventory) {

    if (k.code.slice(0,5)=="Digit") {
      var num = parseInt(k.code.slice(5))-1 
      if (num >= 0 && num < inventory.numCells && inventory.cells[num]) {
        if (inventory.selected == num)inventory.selected = undefined 
        else inventory.selected = num
      }
    }

    if (k.code=="KeyP") {
      isPaused = !isPaused
      if (isPaused) {
          drawnPaused = false
          totalGameTime += new Date()-gameStart
      } else {
        gameStart = new Date() 
      }
    }

    if (eatButton && k.code == "KeyE") {
      eatButton.handleClick()
    }

  } 
}
  
function keyReleased(k) {
  keys[k.code] = false
}

function mouseClicked() {
  soundtrack.update(true)
  if (scene == GAME) {
    inventory.checkSelected()
    if (selectedTile) {
      selectedTile.handleClick()
    }
    if (hitsRect(mouseX,mouseY,eatButton.x, eatButton.y, eatButton.w, eatButton.h)) {
      eatButton.handleClick()
    }
  } else if (scene == MENU) {
    var scenes = [GAME, INSTRUCTIONS, CREDITS]

    for (var i = 0; i < 3; i++) {
      var x = screenWidth/2-menuImg.width/3
      var y = screenHeight/2-menuImg.width/4 + i*menuImg.width/5
      if (menuPlayed && hitsRect(mouseX,mouseY, x, y, menuImg.width*2/3, menuImg.width/5)) {
        if (i ==0) {newGame()}
        else {
          scene = scenes[i]
          var arr = [instructionsImg,creditsImg]
          arr[i-1].play()
        }
      }
    }
  } else if (scene == INSTRUCTIONS || scene == CREDITS) {
    checkBackButton()
  }
}