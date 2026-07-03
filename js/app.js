/* ============================================================
 * Critical Minerals Interlinks — Force-Directed Graph
 * D3.js v7 — plain JS, no build step
 * ============================================================ */

(function () {
  'use strict';

  /* ---------- Global state ---------- */
  let nodes = [];      // all node objects from JSON
  let links = [];      // all link objects from JSON
  let nodeDegree = {}; // { nodeId: degree } — connection count
  let simulation;
  let svg, g, linkGroup, nodeGroup, labelGroup;
  let width, height;
  let linkSel, nodeSel, labelSel;

  /* ---------- 1. Load data and bootstrap ---------- */

  d3.json('data/minerals.json').then(function (data) {
    nodes = data.nodes;
    links = data.links;

    // Compute degree for every node (how many links touch it)
    links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      nodeDegree[s] = (nodeDegree[s] || 0) + 1;
      nodeDegree[t] = (nodeDegree[t] || 0) + 1;
    });

    initSVG();
    initSimulation();
    render();
    buildLegend();
    buildControls();
  }).catch(function (err) {
    console.error('Failed to load graph data:', err);
    d3.select('#graph').append('p')
      .style('padding', '20px')
      .style('color', '#f85149')
      .text('Error loading data: ' + err.message);
  });

  /* ---------- 2. SVG setup with zoom/pan ---------- */

  function initSVG() {
    var container = document.getElementById('graph');
    width = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select('#graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', '0 0 ' + width + ' ' + height);

    // Main <g> group — all graph elements live inside so zoom transforms apply
    g = svg.append('g').attr('class', 'graph-content');

    // Sub-groups for proper layering: links below, nodes above, labels on top
    linkGroup  = g.append('g').attr('class', 'links');
    nodeGroup  = g.append('g').attr('class', 'nodes');
    labelGroup = g.append('g').attr('class', 'labels');

    // Zoom behaviour — scaleExtent [0.1, 4], apply transform to main <g>
    var zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Responsive: resize SVG when window changes
    window.addEventListener('resize', function () {
      width = container.clientWidth;
      height = container.clientHeight;
      svg.attr('width', width).attr('height', height).attr('viewBox', '0 0 ' + width + ' ' + height);
      if (simulation) {
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
      }
    });
  }

  /* ---------- 3. Force simulation ---------- */

  function initSimulation() {
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; }).distance(60).strength(0.05))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(25))
      .on('tick', ticked);
  }

  /* ---------- 4 & 5. Render links, nodes, labels ---------- */

  function render() {

    /* --- Links as <line> elements --- */
    linkSel = linkGroup.selectAll('line.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', function (d) {
        return 'link link-' + d.type;
      });

    /* --- Nodes as <circle> elements --- */
    nodeSel = nodeGroup.selectAll('circle.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', function (d) {
        return 'node node-' + d.type;
      })
      .attr('r', function (d) {
        var deg = nodeDegree[d.id] || 0;
        return Math.min(14, 4 + deg * 0.5);   // scaled by degree
      })
      .style('cursor', 'pointer');

    /* --- Labels as <text> elements, offset by radius + 2 --- */
    labelSel = labelGroup.selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(function (d) { return d.name; })
      .attr('class', function (d) { return 'label label-' + d.type; })
      .attr('dx', function (d) {
        var deg = nodeDegree[d.id] || 0;
        return Math.min(14, 4 + deg * 0.5) + 2;
      })
      .attr('dy', '.35em');

    /* --- 6. Hover behaviour --- */
    nodeSel
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    /* --- 7. Click behaviour --- */
    nodeSel.on('click', function (event, d) {
      event.stopPropagation();
      showPanel(d);
    });

    /* --- 8. Drag behaviour --- */
    nodeSel.call(
      d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    );
  }

  /* ---------- Tick handler — update positions every frame ---------- */

  function ticked() {
    linkSel
      .attr('x1', function (d) { return d.source.x; })
      .attr('y1', function (d) { return d.source.y; })
      .attr('x2', function (d) { return d.target.x; })
      .attr('y2', function (d) { return d.target.y; });

    nodeSel
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });

    labelSel
      .attr('x', function (d) { return d.x; })
      .attr('y', function (d) { return d.y; });
  }

  /* ---------- 6. Hover: highlight neighbors, dim the rest ---------- */

  // Helper: returns a Set of node ids connected to the given node
  function getNeighborIds(node) {
    var neighbors = new Set([node.id]);
    links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === node.id) neighbors.add(t);
      if (t === node.id) neighbors.add(s);
    });
    return neighbors;
  }

  // Helper: is this link connected to the given node?
  function isLinkConnected(link, node) {
    var s = typeof link.source === 'object' ? link.source.id : link.source;
    var t = typeof link.target === 'object' ? link.target.id : link.target;
    return s === node.id || t === node.id;
  }

  function handleMouseOver(event, d) {
    var neighborIds = getNeighborIds(d);

    // Dim all nodes that are NOT neighbors
    nodeSel.classed('dimmed', function (n) {
      return !neighborIds.has(n.id);
    });

    // Dim all labels similarly
    labelSel.classed('dimmed', function (n) {
      return !neighborIds.has(n.id);
    });

    // Dim all links that are NOT connected to this node
    linkSel.classed('dimmed', function (l) {
      return !isLinkConnected(l, d);
    });
  }

  function handleMouseOut(event, d) {
    // Restore full opacity
    nodeSel.classed('dimmed', false);
    labelSel.classed('dimmed', false);
    linkSel.classed('dimmed', false);
  }

  /* ---------- 7. Click: populate side panel ---------- */

  function showPanel(d) {
    var panel = document.getElementById('panel');
    var content = document.getElementById('panel-content');

    // Build HTML for the panel
    var html = '<h2>' + escapeHTML(d.name) + '</h2>';

    // Type
    html += panelField('Type', capitalize(d.type));

    // Type-specific fields
    if (d.type === 'country') {
      if (d.role) html += panelField('Role', escapeHTML(d.role));
      if (d.regulatory) html += panelField('Regulatory', escapeHTML(d.regulatory));
      if (d.reserves) html += panelField('Reserves', escapeHTML(d.reserves));
    } else if (d.type === 'company') {
      if (d.hq) html += panelField('HQ', escapeHTML(d.hq));
      if (d.minerals) html += panelField('Minerals', escapeHTML(d.minerals));
      if (d.position) html += panelField('Position', escapeHTML(d.position));
      if (d.ownership) html += panelField('Ownership', escapeHTML(d.ownership));
      if (d.subsidiaries) html += panelField('Subsidiaries', escapeHTML(d.subsidiaries));
    } else if (d.type === 'mineral') {
      if (d.uses) html += panelField('Uses', escapeHTML(d.uses));
      if (d.top_producers) html += panelField('Top Producers', escapeHTML(d.top_producers));
      if (d.criticality) html += panelField('Criticality', escapeHTML(d.criticality));
      if (d.concentration) html += panelField('Concentration', escapeHTML(d.concentration));
    } else if (d.type === 'deposit') {
      if (d.location) html += panelField('Location', escapeHTML(d.location));
      if (d.size) html += panelField('Size', escapeHTML(d.size));
      if (d.minerals) html += panelField('Minerals', escapeHTML(d.minerals));
      if (d.operators) html += panelField('Operators', escapeHTML(d.operators));
      if (d.production) html += panelField('Production', escapeHTML(d.production));
    }

    // Connections
    var connections = getConnections(d);
    html += '<div class="panel-links"><h3>Connections</h3>';
    if (connections.length === 0) {
      html += '<p style="color:#8b949e;font-size:13px;">No connections</p>';
    } else {
      connections.forEach(function (c) {
        html += '<div class="panel-link-item">';
        html += '<span class="panel-link-type" style="background:' + linkColor(c.type) + '">' + capitalize(c.type) + '</span>';
        html += '<strong>' + escapeHTML(c.targetLabel) + '</strong>';
        if (c.description) {
          html += '<br><span style="color:#8b949e;font-size:12px;">' + escapeHTML(c.description) + '</span>';
        }
        html += '</div>';
      });
    }
    html += '</div>';

    content.innerHTML = html;

    // Show panel
    panel.classList.remove('hidden');
    panel.classList.add('active');
  }

  // Helper: get all connections for a node as structured data
  function getConnections(node) {
    var result = [];
    links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;

      if (s === node.id) {
        // Outgoing link — target is the other node
        var targetNode = nodes.find(function (n) { return n.id === t; });
        result.push({
          type: l.type,
          targetLabel: targetNode ? targetNode.name : t,
          description: l.description || ''
        });
      } else if (t === node.id) {
        // Incoming link — source is the other node
        var sourceNode = nodes.find(function (n) { return n.id === s; });
        result.push({
          type: l.type,
          targetLabel: sourceNode ? sourceNode.name : s,
          description: l.description || ''
        });
      }
    });
    return result;
  }

  // Panel close handler
  document.getElementById('panel-close').addEventListener('click', function () {
    var panel = document.getElementById('panel');
    panel.classList.remove('active');
    panel.classList.add('hidden');
  });

  // Click on empty SVG background closes panel
  svg.on('click', function () {
    var panel = document.getElementById('panel');
    if (panel.classList.contains('active')) {
      panel.classList.remove('active');
      panel.classList.add('hidden');
    }
  });

  /* ---------- 8. Drag behaviour handlers ---------- */

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  /* ---------- 9. Legend (built in JS, styled via CSS) ---------- */

  function buildLegend() {
    var legend = document.getElementById('legend');

    var nodeTypes = [
      { label: 'Company',  cls: 'node-company' },
      { label: 'Country',  cls: 'node-country' },
      { label: 'Mineral',  cls: 'node-mineral' },
      { label: 'Deposit',  cls: 'node-deposit' }
    ];

    var linkTypes = [
      { label: 'Ownership',     cls: 'link-ownership' },
      { label: 'JV',            cls: 'link-jv' },
      { label: 'Offtake',       cls: 'link-offtake' },
      { label: 'Supply',        cls: 'link-supply' },
      { label: 'Produces',      cls: 'link-produces' },
      { label: 'Headquartered', cls: 'link-headquartered' },
      { label: 'Regulates',     cls: 'link-regulates' },
      { label: 'Competes',      cls: 'link-competes' }
    ];

    var html = '';

    // Nodes section
    html += '<div class="legend-section">Nodes</div>';
    nodeTypes.forEach(function (n) {
      var color = getComputedStyle(document.documentElement).getPropertyValue('--color-' + n.cls.replace('node-', ''));
      html += '<div><span class="swatch" style="background:' + color.trim() + '"></span>' + n.label + '</div>';
    });

    // Links section
    html += '<div class="legend-section">Links</div>';
    linkTypes.forEach(function (l) {
      var color = getComputedStyle(document.documentElement).getPropertyValue('--link-' + l.cls.replace('link-', ''));
      html += '<div><span class="line-swatch" style="border-color:' + color.trim() + '"></span>' + l.label + '</div>';
    });

    legend.innerHTML = html;
  }

  /* ---------- Utility functions ---------- */

  // Escape HTML to prevent injection from data fields
  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Capitalize first letter
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Get color for a link type from CSS variables
  function linkColor(type) {
    var map = {
      'ownership':     '#e3b341',
      'jv':            '#39c5cf',
      'offtake':       '#bc8cff',
      'supply':        '#8b949e',
      'produces':      '#3fb950',
      'headquartered': '#f85149',
      'regulates':     '#ff7b72',
      'competes':      '#d2a8ff'
    };
    return map[type] || '#8b949e';
  }

  // Generate a panel field block
  function panelField(label, value) {
    return '<div class="panel-field">' +
           '<div class="panel-label">' + label + '</div>' +
           '<div class="panel-value">' + value + '</div>' +
           '</div>';
  }

  /* ---------- 10. Filter controls & search ---------- */

  // Active type sets — start with everything visible
  var activeNodeTypes = new Set(['company', 'country', 'mineral', 'deposit']);
  var activeLinkTypes = new Set([
    'ownership', 'jv', 'offtake', 'supply',
    'produces', 'headquartered', 'regulates', 'competes'
  ]);

  // Maps button label → internal type string
  var nodeBtnMap = {
    'Companies': 'company',
    'Countries': 'country',
    'Minerals': 'mineral',
    'Deposits': 'deposit'
  };
  var linkBtnMap = {
    'Ownership': 'ownership',
    'JV': 'jv',
    'Offtake': 'offtake',
    'Supply': 'supply',
    'Produces': 'produces',
    'HQ': 'headquartered',
    'Regulates': 'regulates',
    'Competes': 'competes'
  };

  function buildControls() {
    var controls = document.getElementById('controls');
    var html = '';

    // Node filter buttons
    html += '<span class="controls-label">Nodes:</span>';
    Object.keys(nodeBtnMap).forEach(function (label) {
      html += '<button class="active" data-type="' + nodeBtnMap[label] + '" data-kind="node">' + label + '</button>';
    });

    // Link filter buttons
    html += '<span class="controls-label">Links:</span>';
    Object.keys(linkBtnMap).forEach(function (label) {
      html += '<button class="active" data-type="' + linkBtnMap[label] + '" data-kind="link">' + label + '</button>';
    });

    // Search input
    html += '<input type="search" id="search" placeholder="Search...">';

    controls.innerHTML = html;

    // Wire up filter buttons
    controls.querySelectorAll('button[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-type');
        var kind = btn.getAttribute('data-kind');
        var set = kind === 'node' ? activeNodeTypes : activeLinkTypes;
        if (set.has(type)) {
          set.delete(type);
          btn.classList.remove('active');
        } else {
          set.add(type);
          btn.classList.add('active');
        }
        applyFilters();
      });
    });

    // Wire up search input
    var searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function () {
      applySearch(this.value);
    });
  }

  // Helper: get node type from link endpoint (source/target may be object or string id)
  function linkNodeType(endpoint) {
    if (typeof endpoint === 'object' && endpoint !== null) {
      return endpoint.type;
    }
    // It's a string id — look up in nodes array
    var found = nodes.find(function (n) { return n.id === endpoint; });
    return found ? found.type : null;
  }

  function applyFilters() {
    // Filter nodes
    nodeSel.style('display', function (d) {
      return activeNodeTypes.has(d.type) ? null : 'none';
    });
    labelSel.style('display', function (d) {
      return activeNodeTypes.has(d.type) ? null : 'none';
    });

    // Filter links: show only if both endpoints' node types are active AND link type is active
    linkSel.style('display', function (d) {
      var sourceType = linkNodeType(d.source);
      var targetType = linkNodeType(d.target);
      if (activeNodeTypes.has(sourceType) &&
          activeNodeTypes.has(targetType) &&
          activeLinkTypes.has(d.type)) {
        return null;
      }
      return 'none';
    });

    // Re-layout with small alpha
    simulation.alpha(0.3).restart();
  }

  function applySearch(query) {
    query = query.trim().toLowerCase();

    // Clear search state
    nodeSel.style('opacity', null).attr('r', function (d) {
      var deg = nodeDegree[d.id] || 0;
      return Math.min(14, 4 + deg * 0.5); // restore original radius
    });
    labelSel.style('opacity', null);
    linkSel.style('opacity', null);

    if (query === '') {
      return; // nothing to highlight
    }

    var matches = [];

    nodeSel.each(function (d) {
      // Only search visible (non-filtered) nodes
      if (activeNodeTypes.has(d.type) && d.name.toLowerCase().includes(query)) {
        matches.push(d);
      }
    });

    // Determine which node ids match
    var matchIds = new Set(matches.map(function (d) { return d.id; }));

    nodeSel.style('opacity', function (d) {
      if (!activeNodeTypes.has(d.type)) return null; // hidden by filter, leave alone
      return matchIds.has(d.id) ? 1 : 0.1;
    }).attr('r', function (d) {
      if (!activeNodeTypes.has(d.type)) return null;
      var deg = nodeDegree[d.id] || 0;
      var baseR = Math.min(14, 4 + deg * 0.5);
      return matchIds.has(d.id) ? baseR * 1.5 : baseR;
    });

    labelSel.style('opacity', function (d) {
      if (!activeNodeTypes.has(d.type)) return null;
      return matchIds.has(d.id) ? 1 : 0.1;
    });

    linkSel.style('opacity', function (d) {
      var sId = typeof d.source === 'object' ? d.source.id : d.source;
      var tId = typeof d.target === 'object' ? d.target.id : d.target;
      // Only fade visible links
      var sourceType = linkNodeType(d.source);
      var targetType = linkNodeType(d.target);
      if (!activeNodeTypes.has(sourceType) || !activeNodeTypes.has(targetType) || !activeLinkTypes.has(d.type)) {
        return null; // hidden by filter, leave alone
      }
      return (matchIds.has(sId) || matchIds.has(tId)) ? 1 : 0.1;
    });

    // If exactly one match, gently center on it
    if (matches.length === 1) {
      var d = matches[0];
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }
  }

})();