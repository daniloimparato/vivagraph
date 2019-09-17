function nodeLoadTransform(node) {
  return {
    id: node.id, data: {
      size: node.size,
      x: node.x,
      y: node.y
    }
  }
}

function linkLoadTransform(link) {
  return {
    fromId: link.fromId,
    toId: link.toId
  }
}

// async function graphFromJSON(file){
//     let x = await (await fetch(file)).text();
//     return x;
// }
// var test = await graphFromJSON('patricia.json');

fetch('patricia.json')
  .then((response) => response.text())
  .then((jsonText) => {
    var graph = Viva.Graph.serializer().loadFromJSON(jsonText, nodeLoadTransform, linkLoadTransform);

    var layout = Viva.Graph.Layout.forceDirected(graph, {
      springLength: 100, //30
      springCoeff: 0.0002, //0.0008
      gravity: -0.4, //-1.2
      theta: 0.4,//0.8
      dragCoeff: 0.05,//0.02
      timeStep: 5,//20
    });

    graph.forEachNode(function (node) {
      console.log(node);
      if (node.links == null) {
        graph.removeNode(node.id);
      } else {
        layout.setNodePosition(node.id, (node.data.x * 1000) - 500, (node.data.y * 1000) - 500);
      }
    });

    var graphics = Viva.Graph.View.webglGraphics();

    graphics.node(function (node) {
      return Viva.Graph.View.webglSquare(node.data.size * 10, "#000000");
    })
    // .link(function(link) {
    //   return Viva.Graph.View.webglLine(colors[(Math.random() * colors.length) << 0]);
    // });

    // var graphics = Viva.Graph.View.svgGraphics();

    // graphics.node(function(node){
    //     return Viva.Graph.svg('circle').attr('r', Math.sqrt(node.data.size*100));
    // }).placeNode(function(nodeUI, pos){
    //     nodeUI.attr( "cx", pos.x).attr("cy", pos.y);
    // });

    var renderer = Viva.Graph.View.renderer(graph,
      {
        container: document.getElementById('graph-container'),
        graphics: graphics,
        layout: layout
      });

    var events = Viva.Graph.webglInputEvents(graphics, graph);

    var selectedNodes = [];

    var initialPosition = {x: 0, y:0};
    var movePosition = {x: 0, y:0};

    // events.mouseEnter(function (node) {
    //   console.log('Mouse entered node: ', node);
    // }).mouseLeave(function (node) {
    //   console.log('Mouse left node: ', node);
    // }).dblClick(function (node) {
    //   console.log('Double click on node: ', node);
    // }).click(function (node) {
    //   console.log('Single click on node: ', node);
    // }).mouseDown(function (node) {
    //   console.log('Mouse down on node: ', node);
    //   initialPosition = layout.getNodePosition(node.id);
    // }).mouseMove(function (node) {
    //   console.log('Mouse move on node: ', node);
    //   graph.forEachNode(function(eachNode){
    //     if(selectedNodes.map(selNodes=>{selNodes.id}).includes(eachNode.id)) {
    //       var currPos = layout.getNodePosition(eachNode.id);
    //       var diffX = layout.getNodePosition(node.id).x - initialPosition.x;
    //       var diffY = layout.getNodePosition(node.id).y - initialPosition.y;
    //       layout.setNodePosition(eachNode, currPos.x + diffX, currPos.y + diffY);
    //     }
    //   });
    //   // movePosition = layout.getNodePosition(node.id);
    // }).mouseUp(function (node) {
    //   console.log('Mouse up on node: ', node);
    // });

    events.mouseDown(function (node) {
      console.log('Mouse down on node: ', node);
      initialPosition = layout.getNodePosition(node.id);
    }).mouseMove(function (node) {
      console.log('Mouse move on node: ', node);
      graph.forEachNode(function(eachNode){
        console.log(selectedNodes);
        if(selectedNodes.some(selectedNode => selectedNode.id == eachNode.id )){
          var currPos = layout.getNodePosition(eachNode.id);
          layout.setNodePosition(eachNode, currPos.x + 10, currPos.y + 10);
        }
        // if(selectedNodes.map(selNodes=>{selNodes.id}).includes(eachNode.id)) {
        //   var currPos = layout.getNodePosition(eachNode.id);
        //   var diffX = layout.getNodePosition(node.id).x - initialPosition.x;
        //   var diffY = layout.getNodePosition(node.id).y - initialPosition.y;
        //   layout.setNodePosition(eachNode, currPos.x + diffX, currPos.y + diffY);
        // }
      });
      // movePosition = layout.getNodePosition(node.id);
    }).mouseUp(function (node) {
      console.log('Mouse up on node: ', node);
    });

    renderer.run();

    //////////////////////////////////
    // force layout controls
    //////////////////////////////////
    var controls = document.querySelectorAll('.control .layout');

    for (var i = 0; i < controls.length; i++) {
      controls[i].oninput = function () {
        layout.simulator[this.id](this.value);
        console.log(this.id, this.value)
      }
    }

    document.getElementById('remove-overlaps').onchange = function () {
      if (this.checked) Viva.Graph.Layout.removeOverlaps(layout, { active: true });
      else Viva.Graph.Layout.removeOverlaps(layout, { active: false });
    }

    document.getElementById('run').onchange = function () {
      if (this.checked) renderer.resume();
      else renderer.pause();
    }

    document.getElementById('get').onclick = function () {
      coords.value = '';
      graph.forEachNode(function (node) {
        var pos = layout.getNodePosition(node.id);
        coords.value += node.id + '\t' + pos.x + '\t' + pos.y + '\n'
      });
    }

    //////////////////////////////////
    // area selection
    //////////////////////////////////
    var multiSelectOverlay;

    document.addEventListener('keydown', function (e) {
      if (e.which === 16 && !multiSelectOverlay) { // shift key
        multiSelectOverlay = startMultiSelect(graph, renderer, layout, selectedNodes);
      }
    });
    document.addEventListener('keyup', function (e) {
      if (e.which === 16 && multiSelectOverlay) {
        multiSelectOverlay.destroy();
        multiSelectOverlay = null;
      }
    });

  });


function startMultiSelect(graph, renderer, layout, selectedNodes) {
  var graphics = renderer.getGraphics();
  var domOverlay = document.querySelector('.graph-overlay');
  var overlay = createOverlay(domOverlay);
  overlay.onAreaSelected(handleAreaSelected);

  return overlay;

  function handleAreaSelected(area) {
    // For the sake of this demo we are using silly O(n) implementation.
    // Could be improved with spatial indexing if required.
    var topLeft = graphics.transformClientToGraphCoordinates({
      x: area.x,
      y: area.y
    });

    var bottomRight = graphics.transformClientToGraphCoordinates({
      x: area.x + area.width,
      y: area.y + area.height
    });
    
    selectedNodes = [];

    graph.forEachNode(higlightIfInside);

    console.log(selectedNodes);

    renderer.rerender();

    return;

    function higlightIfInside(node) {
      var nodeUI = graphics.getNodeUI(node.id);
      if (isInside(node.id, topLeft, bottomRight)) {

        node.selected = true;

        nodeUI.color = 0xFFA500ff;

        selectedNodes.push(node);
        
        console.log(node);

        // nodeUI.size = 20;
      } else {
        node.selected = false;
        nodeUI.color = 0x000000ff;
        // nodeUI.size = 10;
      }
    }

    function isInside(nodeId, topLeft, bottomRight) {
      var nodePos = layout.getNodePosition(nodeId);
      return (topLeft.x < nodePos.x && nodePos.x < bottomRight.x &&
        topLeft.y < nodePos.y && nodePos.y < bottomRight.y);
    }
  }
}

function createOverlay(overlayDom) {
  var selectionClasName = 'graph-selection-indicator';
  var selectionIndicator = overlayDom.querySelector('.' + selectionClasName);
  if (!selectionIndicator) {
    selectionIndicator = document.createElement('div');
    selectionIndicator.className = selectionClasName;
    overlayDom.appendChild(selectionIndicator);
  }

  var notify = [];
  var dragndrop = Viva.Graph.Utils.dragndrop(overlayDom);
  var selectedArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  var startX = 0;
  var startY = 0;

  dragndrop.onStart(function (e) {
    startX = selectedArea.x = e.clientX;
    startY = selectedArea.y = e.clientY;
    selectedArea.width = selectedArea.height = 0;

    updateSelectedAreaIndicator();
    selectionIndicator.style.display = 'block';
  });

  dragndrop.onDrag(function (e) {
    recalculateSelectedArea(e);
    updateSelectedAreaIndicator();
    notifyAreaSelected();
  });

  dragndrop.onStop(function () {
    selectionIndicator.style.display = 'none';
  });

  overlayDom.style.display = 'block';

  return {
    onAreaSelected: function (cb) {
      notify.push(cb);
    },
    destroy: function () {
      overlayDom.style.display = 'none';
      dragndrop.release();
    }
  };

  function notifyAreaSelected() {
    notify.forEach(function (cb) {
      cb(selectedArea);
    });
  }

  function recalculateSelectedArea(e) {
    selectedArea.width = Math.abs(e.clientX - startX);
    selectedArea.height = Math.abs(e.clientY - startY);
    selectedArea.x = Math.min(e.clientX, startX);
    selectedArea.y = Math.min(e.clientY, startY);
  }

  function updateSelectedAreaIndicator() {
    selectionIndicator.style.left = selectedArea.x + 'px';
    selectionIndicator.style.top = selectedArea.y + 'px';
    selectionIndicator.style.width = selectedArea.width + 'px';
    selectionIndicator.style.height = selectedArea.height + 'px';
  }
}
