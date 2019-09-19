// function nodeLoadTransform(node) {
//   // return {
//   //   id: node.id, data: {
//   //     size: node.size,
//   //     x: node.x,
//   //     y: node.y
//   //   }
//   // }
//   return {
//     id: node.id
//   }
// }

// function linkLoadTransform(link) {
//   return {
//     fromId: link.fromId,
//     toId: link.toId
//   }
// }

var graph_json = {
  nodes: [{ id: "a", x: 1, y: 1, size: 20 }, { id: "b" }],
  links: [{ fromId: "a", toId: "b" }]
}

var nodeLoadTransform = (function () {
  var idKey = Object.keys(graph_json.nodes[0])[0];
  return function (node) {
    return {
      id: node[idKey],
      data: node
    }
  }
})();

var linkLoadTransform = (function () {
  var from = Object.keys(graph_json.links[0])[0];
  var to = Object.keys(graph_json.links[0])[1];
  return function (link) {
    return {
      fromId: link[from],
      toId: link[to],
      data: link
    }
  }
})();

var graph = Viva.Graph.serializer().loadFromJSON(graph_json, nodeLoadTransform, linkLoadTransform);

var layout = Viva.Graph.Layout.forceDirected(graph, {
  springLength: 100, //30
  springCoeff: 0.0002, //0.0008
  gravity: -0.4, //-1.2
  theta: 0.4,//0.8
  dragCoeff: 0.05,//0.02
  timeStep: 5,//20
});

graph.forEachNode(function (node) {
    if(node.data.x)
      layout.setNodePosition(node.id, node.data.x, node.data.y);
    else
    layout.setNodePosition(node.id, (Math.random() * 500), (Math.random() * 500));
});

var graphics = Viva.Graph.View.webglGraphics();

graphics.node(function (node) {
  if (node.data.size)
    return Viva.Graph.View.webglSquare(node.data.size, "#000000");
  else
    return Viva.Graph.View.webglSquare(5, "#000000");
})

var renderer = Viva.Graph.View.renderer(graph,
  {
    container: document.getElementById('graph-container'),
    graphics: graphics,
    layout: layout
  });

var events = Viva.Graph.webglInputEvents(graphics, graph);

var selectedNodes = [];

var initialPosition = { x: 0, y: 0 };

events.mouseDown(function (draggedNode) {
  initialPosition = Object.assign({}, layout.getNodePosition(draggedNode.id));
  console.log(`Mouse down on node: ${draggedNode.id} / ${JSON.stringify(initialPosition)}`);
}).mouseMove(function (draggedNode) {
  //lala
}).mouseUp(function (draggedNode) {

  graph.forEachNode(function (iteratedNode) {
    // if(iteratedNode.selected && draggedNode){
    if (iteratedNode.selected && draggedNode && iteratedNode.id != draggedNode.id) {
      console.log(`Mouse up on node: ${draggedNode.id} / ${JSON.stringify(layout.getNodePosition(draggedNode.id))}`);
      console.log(`Initial position: ${JSON.stringify(initialPosition)}`)

      var iteratedNodePosition = layout.getNodePosition(iteratedNode.id);

      var draggedNodePosition = layout.getNodePosition(draggedNode.id);

      layout.setNodePosition(iteratedNode.id,
        iteratedNodePosition.x + (draggedNodePosition.x - initialPosition.x),
        iteratedNodePosition.y + (draggedNodePosition.y - initialPosition.y));
    }
  });

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
