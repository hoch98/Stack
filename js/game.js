const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var dead = false;

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

var vertexShader = `
    varying vec2 vUv;
    void main()	{
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
`;

var fragmentShader = `
		//#extension GL_OES_standard_derivatives : enable
    
    varying vec2 vUv;
    uniform float thickness;
   	
    float edgeFactor(vec2 p){
    	vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
  		return min(grid.x, grid.y);
    }
    
    void main() {
			
      float a = edgeFactor(vUv);
      
      vec3 c = mix(vec3(1), vec3(0), a);
      
      gl_FragColor = vec4(c, 1.0);
    }
`;

const geometry = new THREE.BoxGeometry( 3, 10, 3 );
var material = new THREE.ShaderMaterial({
    uniforms: {
      thickness: {
          value: 1.5
      }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
});

material.diffuse = { type: "c", value: { r:255, g:0, b:0 } };

var startingY = 5.5;
var currentlevel = 0

const directionalLight = new THREE.DirectionalLight( 0xffffff, 100 );
scene.add( directionalLight );

const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 7;
camera.position.y = 8;
camera.position.x = 7;
camera.rotation.y = 0.785398;

directionalLight.position.copy(camera.position)

var nonNegative = 1;

var newgeo;
var newcube;

const getIntersectingRectangle = (r1, r2) => {  
  [r1, r2] = [r1, r2].map(r => {
    return {
      x: [r.x1, r.x2].sort((a,b) => a - b),
      y: [r.y1, r.y2].sort((a,b) => a - b)
    };
  });

  const noIntersect = r2.x[0] > r1.x[1] || r2.x[1] < r1.x[0] ||
                      r2.y[0] > r1.y[1] || r2.y[1] < r1.y[0];

  return noIntersect ? false : {
    x1: Math.max(r1.x[0], r2.x[0]), // _[0] is the lesser,
    y1: Math.max(r1.y[0], r2.y[0]), // _[1] is the greater
    x2: Math.min(r1.x[1], r2.x[1]),
    y2: Math.min(r1.y[1], r2.y[1])
  };
};

var direction = -1;

function createNewFloor(event) {

    if (event != undefined) {
        if (event.which != 32) {
            return false;
        }
    
        if (dead) {
            location.reload()
            return false;
        }
    }

    direction *= -1;

    if (currentlevel != 0) {
        var prevcube = scene.children[scene.children.indexOf(newcube)-1]

        var a1 = prevcube.position.clone()
        a1.x += prevcube.geometry.parameters.width/2
        a1.z += prevcube.geometry.parameters.depth/2
        var a2 = prevcube.position.clone()
        a2.x -= prevcube.geometry.parameters.width/2
        a2.z -= prevcube.geometry.parameters.depth/2
        
        var b1 = newcube.position.clone()
        b1.x += newcube.geometry.parameters.width/2
        b1.z += newcube.geometry.parameters.depth/2
        var b2 = newcube.position.clone()
        b2.x -= newcube.geometry.parameters.width/2
        b2.z -= newcube.geometry.parameters.depth/2

        var rectangleA = {x1: a1.x, y1: a1.z, x2: a2.x, y2: a2.z}
        var rectangleB = {x1: b1.x, y1: b1.z, x2: b2.x, y2: b2.z}

        var tempsaverec = getIntersectingRectangle(rectangleA, rectangleB)

        if (tempsaverec) {
            var width = Math.abs(tempsaverec.x1-tempsaverec.x2)
            var depth = Math.abs(tempsaverec.y1-tempsaverec.y2)
            var position = new THREE.Vector3((tempsaverec.x1+tempsaverec.x2)/2,startingY + currentlevel-1,(tempsaverec.y1+tempsaverec.y2)/2)
            scene.remove(newcube)
            newcube = new THREE.Mesh( new THREE.BoxGeometry( width, 1, depth ), material );
            scene.add( newcube );

            newcube.position.copy(position)
        } else {
            document.body.querySelector(".wiper").style.visibility = "visible";
            document.getElementById("tip").style.visibility = "hidden"
            var deadtext = document.createElement("h1")
            deadtext.id = "deadtext"
            deadtext.textContent = "YOU DIED!"
            document.body.appendChild(deadtext)

            var restartText = document.createElement("h1")
            restartText.id = "restarttext"
            restartText.textContent = "Press space to restart!"
            document.body.appendChild(restartText)
            dead = true;
        }
    }

    if (currentlevel == 0) {
        newgeo = new THREE.BoxGeometry( 3, 1, 3 );
    } else {
        newgeo = new THREE.BoxGeometry( newcube.geometry.parameters.width, 1, newcube.geometry.parameters.depth );
    }

    newcube = new THREE.Mesh( newgeo, material );
    scene.add( newcube );

    if (direction == 1) {
        newcube.position.z = -8
        if (currentlevel != 0) {
            newcube.position.x = scene.children[scene.children.indexOf(newcube)-1].position.x
        }
    } else {
        newcube.position.x = -8
        if (currentlevel != 0) {
            newcube.position.z = scene.children[scene.children.indexOf(newcube)-1].position.z
        }
    }
    newcube.position.y = startingY + currentlevel
    currentlevel += 1

    if (currentlevel != 1) {
        document.getElementById("score").innerText = "Score: "+(currentlevel-1).toString()
    }

}

document.addEventListener("keyup", createNewFloor)

setTimeout(createNewFloor, 1500)

function animate() {
    if (!dead) {
        requestAnimationFrame( animate );
        renderer.render( scene, camera );
        if (newcube) {
            if (newcube.position.z >= 6) {
                nonNegative = -1
            } if (newcube.position.z <= -6) {
                nonNegative = 1
            } if (newcube.position.x >= 6) {
                nonNegative = -1
            } if (newcube.position.x <= -6) {
                nonNegative = 1
            }
            if (direction == 1) {
                newcube.position.z += nonNegative * (0.15+currentlevel*0.005)
            } else {
                newcube.position.x += nonNegative * (0.15+currentlevel*0.005)
            }

        }

        if (currentlevel >= 2) {
            camera.position.lerp(new THREE.Vector3(7, 6+currentlevel, 7), 0.1)
        }
    }
}

animate();