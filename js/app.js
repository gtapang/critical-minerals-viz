/* ============================================================
 * Critical Minerals Geopolitical Network — Pax-Silica v4
 * D3.js v7 — plain JS, no build step
 * ============================================================ */

(function () {
  'use strict';

  /* ---------- Global state ---------- */
  var nodes = [];
  var links = [];
  var nodeDegree = {};
  var simulation;
  var svg, g, linkGroup, nodeGroup, labelGroup;
  var width, height;
  var linkSel, nodeSel, labelSel;

  /* ---------- Node type config ---------- */
  var NODE_TYPES = ['country', 'company', 'mineral', 'deposit', 'person', 'regulatory'];
  var NODE_LABELS = {
    country: 'Countries',
    company: 'Companies',
    mineral: 'Minerals',
    deposit: 'Deposits',
    person: 'People',
    regulatory: 'Regulatory'
  };

  /* ---------- Link type config ---------- */
  var LINK_TYPES = [
    'member_of', 'controls', 'partner', 'competes', 'produces',
    'secures', 'founded', 'chairs', 'located_in', 'operates',
    'processes', 'supply', 'processed_into', 'offtake', 'equity',
    'sanctions', 'recycles'
  ];
  var LINK_LABELS = {
    member_of: 'Member',
    controls: 'Controls',
    partner: 'Partner',
    competes: 'Competes',
    produces: 'Produces',
    secures: 'Secures',
    founded: 'Founded',
    chairs: 'Chairs',
    located_in: 'Located',
    operates: 'Operates',
    processes: 'Processes',
    supply: 'Supply',
    processed_into: 'Proc.into',
    offtake: 'Offtake',
    equity: 'Equity',
    sanctions: 'Sanctions',
    recycles: 'Recycles'
  };

  /* ---------- Link color map ---------- */
  var LINK_COLORS = {
    member_of: '#58a6ff',
    controls: '#ff8c00',
    partner: '#39c5cf',
    competes: '#d2a8ff',
    produces: '#3fb950',
    secures: '#bc8cff',
    founded: '#e3b341',
    chairs: '#ffa657',
    located_in: '#8b949e',
    operates: '#f0883e',
    processes: '#56d4dd',
    supply: '#79c0ff',
    processed_into: '#a371f7',
    offtake: '#bc8cff',
    equity: '#e3b341',
    sanctions: '#ff7b72',
    recycles: '#3fb950'
  };

  /* ---------- 1. Load data and bootstrap ---------- */

  d3.json('data/minerals.json').then(function (data) {
    nodes = data.nodes;
    links = data.links;

    // Skip metadata block if present
    if (nodes.metadata) delete nodes.metadata;

    // Compute degree
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

    // Panel close
    document.getElementById('panel-close').addEventListener('click', function () {
      var panel = document.getElementById('panel');
      panel.classList.remove('active');
      panel.classList.add('hidden');
    });

    // Click on empty SVG closes panel
    svg.on('click', function () {
      var panel = document.getElementById('panel');
      if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        panel.classList.add('hidden');
      }
    });
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

    svg = d3.select('#graph').append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', '0 0 ' + width + ' ' + height);

    g = svg.append('g').attr('class', 'graph-content');
    linkGroup = g.append('g').attr('class', 'links');
    nodeGroup = g.append('g').attr('class', 'nodes');
    labelGroup = g.append('g').attr('class', 'labels');

    var zoom = d3.zoom()
      .scaleExtent([0.05, 8])
      .on('zoom', function (event) { g.attr('transform', event.transform); });
    svg.call(zoom);

    window.addEventListener('resize', function () {
      width = container.clientWidth;
      height = container.clientHeight;
      svg.attr('width', width).attr('height', height)
        .attr('viewBox', '0 0 ' + width + ' ' + height);
      if (simulation) {
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
      }
    });
  }

  /* ---------- 3. Force simulation ---------- */

  function initSimulation() {
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; })
        .distance(function (l) { return 40 + (l.weight || 5) * 4; })
        .strength(0.03))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(20))
      .on('tick', ticked);
  }

  /* ---------- 4. Render ---------- */

  function render() {
    // Links
    linkSel = linkGroup.selectAll('line.link')
      .data(links).enter().append('line')
      .attr('class', function (d) { return 'link link-' + d.type; })
      .attr('stroke-width', function (d) { return Math.max(1, (d.weight || 5) * 0.3); });

    // Nodes
    nodeSel = nodeGroup.selectAll('circle.node')
      .data(nodes).enter().append('circle')
      .attr('class', function (d) { return 'node node-' + d.type; })
      .attr('r', function (d) {
        var deg = nodeDegree[d.id] || 0;
        return Math.min(12, 3 + deg * 0.4);
      })
      .style('cursor', 'pointer');

    // Labels
    labelSel = labelGroup.selectAll('text')
      .data(nodes).enter().append('text')
      .text(function (d) { return d.label; })
      .attr('class', function (d) { return 'label label-' + d.type; })
      .attr('dx', function (d) {
        var deg = nodeDegree[d.id] || 0;
        return Math.min(12, 3 + deg * 0.4) + 2;
      })
      .attr('dy', '.35em');

    // Hover
    nodeSel.on('mouseover', handleMouseOver).on('mouseout', handleMouseOut);

    // Click
    nodeSel.on('click', function (event, d) {
      event.stopPropagation();
      showPanel(d);
    });

    // Drag
    nodeSel.call(
      d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    );
  }

  /* ---------- Tick handler ---------- */

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

  /* ---------- 5. Hover ---------- */

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

  function isLinkConnected(link, node) {
    var s = typeof link.source === 'object' ? link.source.id : link.source;
    var t = typeof link.target === 'object' ? link.target.id : link.target;
    return s === node.id || t === node.id;
  }

  function handleMouseOver(event, d) {
    var neighborIds = getNeighborIds(d);
    nodeSel.classed('dimmed', function (n) { return !neighborIds.has(n.id); });
    labelSel.classed('dimmed', function (n) { return !neighborIds.has(n.id); });
    linkSel.classed('dimmed', function (l) { return !isLinkConnected(l, d); });
  }

  function handleMouseOut() {
    nodeSel.classed('dimmed', false);
    labelSel.classed('dimmed', false);
    linkSel.classed('dimmed', false);
  }

  /* ---------- 6. Click: detail panel ---------- */

  function showPanel(d) {
    var panel = document.getElementById('panel');
    var content = document.getElementById('panel-content');
    var html = '<h2>' + escapeHTML(d.label) + '</h2>';

    html += panelField('Type', capitalize(d.type));

    // Flags
    if (d.flags && d.flags.length) {
      html += panelField('Flags', d.flags.map(function (f) {
        return '<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;background:#30363d;margin-right:3px;">' + escapeHTML(f) + '</span>';
      }).join(''));
    }

    // Type-specific fields
    if (d.type === 'country') {
      if (d.notes) html += panelField('Notes', escapeHTML(d.notes));
    } else if (d.type === 'company') {
      if (d.country) html += panelField('Country', escapeHTML(d.country));
      if (d.notes) html += panelField('Notes', escapeHTML(d.notes));
    } else if (d.type === 'mineral') {
      if (d.formula) html += panelField('Formula', escapeHTML(d.formula));
      if (d.uses) html += panelField('Uses', escapeHTML(d.uses));
    } else if (d.type === 'deposit') {
      if (d.country) html += panelField('Country', escapeHTML(d.country));
      if (d.mineral) html += panelField('Mineral', escapeHTML(d.mineral));
      if (d.notes) html += panelField('Notes', escapeHTML(d.notes));
    } else if (d.type === 'person') {
      if (d.affiliation) html += panelField('Affiliation', escapeHTML(d.affiliation));
      if (d.nationality) html += panelField('Nationality', escapeHTML(d.nationality));
      if (d.notes) html += panelField('Notes', escapeHTML(d.notes));
    } else if (d.type === 'regulatory') {
      if (d.subtype) html += panelField('Subtype', escapeHTML(d.subtype));
      if (d.full_name) html += panelField('Full Name', escapeHTML(d.full_name));
      if (d.launched) html += panelField('Launched', escapeHTML(d.launched));
      if (d.members_count) html += panelField('Members', escapeHTML(String(d.members_count)));
      if (d.notes) html += panelField('Notes', escapeHTML(d.notes));
    }

    // Connections
    var connections = getConnections(d);
    html += '<div class="panel-links"><h3>Connections</h3>';
    if (connections.length === 0) {
      html += '<p style="color:#8b949e;font-size:13px;">No connections</p>';
    } else {
      connections.forEach(function (c) {
        html += '<div class="panel-link-item">';
        html += '<span class="panel-link-type" style="background:' + (LINK_COLORS[c.type] || '#8b949e') + '">' + capitalize(c.type.replace(/_/g, ' ')) + '</span>';
        html += '<strong>' + escapeHTML(c.targetLabel) + '</strong>';
        if (c.weight) {
          html += ' <span style="color:#6e7681;font-size:11px;">w:' + c.weight + '</span>';
        }
        html += '</div>';
      });
    }
    html += '</div>';

    content.innerHTML = html;
    panel.classList.remove('hidden');
    panel.classList.add('active');
  }

  function getConnections(node) {
    var result = [];
    links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === node.id) {
        var targetNode = nodes.find(function (n) { return n.id === t; });
        result.push({ type: l.type, targetLabel: targetNode ? targetNode.label : t, weight: l.weight });
      } else if (t === node.id) {
        var sourceNode = nodes.find(function (n) { return n.id === s; });
        result.push({ type: l.type, targetLabel: sourceNode ? sourceNode.label : s, weight: l.weight });
      }
    });
    return result;
  }

  /* ---------- 7. Drag ---------- */

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  /* ---------- 8. Legend ---------- */

  function buildLegend() {
    var legend = document.getElementById('legend');
    var html = '';

    // Nodes
    html += '<div class="legend-section">Nodes</div>';
    NODE_TYPES.forEach(function (t) {
      var color = getComputedStyle(document.documentElement).getPropertyValue('--color-' + t);
      html += '<div><span class="swatch" style="background:' + color.trim() + '"></span>' + capitalize(t) + '</div>';
    });

    // Links
    html += '<div class="legend-section">Links</div>';
    LINK_TYPES.forEach(function (t) {
      html += '<div><span class="line-swatch" style="border-color:' + (LINK_COLORS[t] || '#8b949e') + '"></span>' + (LINK_LABELS[t] || capitalize(t)) + '</div>';
    });

    legend.innerHTML = html;
  }

  /* ---------- 9. Filters & Search ---------- */

  var activeNodeTypes = new Set(NODE_TYPES);
  var activeLinkTypes = new Set(LINK_TYPES);

  function buildControls() {
    var controls = document.getElementById('controls');
    var html = '';

    // Node filters
    html += '<span class="controls-label">Nodes:</span>';
    NODE_TYPES.forEach(function (t) {
      html += '<button class="active" data-type="' + t + '" data-kind="node">' + NODE_LABELS[t] + '</button>';
    });

    // Link filters
    html += '<span class="controls-label">Links:</span>';
    LINK_TYPES.forEach(function (t) {
      html += '<button class="active" data-type="' + t + '" data-kind="link">' + (LINK_LABELS[t] || capitalize(t)) + '</button>';
    });

    // Search
    html += '<input type="search" id="search" placeholder="Search...">';
    controls.innerHTML = html;

    // Wire buttons
    controls.querySelectorAll('button[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-type');
        var kind = btn.getAttribute('data-kind');
        var set = kind === 'node' ? activeNodeTypes : activeLinkTypes;
        if (set.has(type)) { set.delete(type); btn.classList.remove('active'); }
        else { set.add(type); btn.classList.add('active'); }
        applyFilters();
      });
    });

    // Wire search
    document.getElementById('search').addEventListener('input', function () {
      applySearch(this.value);
    });
  }

  function linkNodeType(endpoint) {
    if (typeof endpoint === 'object' && endpoint !== null) return endpoint.type;
    var found = nodes.find(function (n) { return n.id === endpoint; });
    return found ? found.type : null;
  }

  function applyFilters() {
    nodeSel.style('display', function (d) { return activeNodeTypes.has(d.type) ? null : 'none'; });
    labelSel.style('display', function (d) { return activeNodeTypes.has(d.type) ? null : 'none'; });
    linkSel.style('display', function (d) {
      var st = linkNodeType(d.source), tt = linkNodeType(d.target);
      return (activeNodeTypes.has(st) && activeNodeTypes.has(tt) && activeLinkTypes.has(d.type)) ? null : 'none';
    });
    simulation.alpha(0.3).restart();
  }

  function applySearch(query) {
    query = query.trim().toLowerCase();
    nodeSel.style('opacity', null).attr('r', function (d) {
      var deg = nodeDegree[d.id] || 0;
      return Math.min(12, 3 + deg * 0.4);
    });
    labelSel.style('opacity', null);
    linkSel.style('opacity', null);
    if (query === '') return;

    var matchIds = new Set();
    nodes.forEach(function (d) {
      if (activeNodeTypes.has(d.type) && d.label.toLowerCase().includes(query)) matchIds.add(d.id);
    });

    nodeSel.style('opacity', function (d) {
      if (!activeNodeTypes.has(d.type)) return null;
      return matchIds.has(d.id) ? 1 : 0.1;
    }).attr('r', function (d) {
      if (!activeNodeTypes.has(d.type)) return null;
      var deg = nodeDegree[d.id] || 0;
      var baseR = Math.min(12, 3 + deg * 0.4);
      return matchIds.has(d.id) ? baseR * 1.5 : baseR;
    });
    labelSel.style('opacity', function (d) {
      if (!activeNodeTypes.has(d.type)) return null;
      return matchIds.has(d.id) ? 1 : 0.1;
    });
    linkSel.style('opacity', function (d) {
      var st = linkNodeType(d.source), tt = linkNodeType(d.target);
      if (!activeNodeTypes.has(st) || !activeNodeTypes.has(tt) || !activeLinkTypes.has(d.type)) return null;
      var sId = typeof d.source === 'object' ? d.source.id : d.source;
      var tId = typeof d.target === 'object' ? d.target.id : d.target;
      return (matchIds.has(sId) || matchIds.has(tId)) ? 1 : 0.1;
    });
  }

  /* ---------- Utilities ---------- */

  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function panelField(label, value) {
    return '<div class="panel-field"><div class="panel-label">' + label +
           '</div><div class="panel-value">' + value + '</div></div>';
  }

  /* ---------- 11. Sankey diagram ---------- */

  var sankeyBuilt = false;

  function initSankey() {
    if (sankeyBuilt) return;
    sankeyBuilt = true;

    // Build Sankey from supply chain links: produces, supply, processes, processed_into, operates, offtake
    var sanLinkTypes = new Set(['produces', 'supply', 'processes', 'processed_into', 'operates', 'offtake', 'secures', 'recycles']);

    // Filter links relevant to flow
    var flowLinks = links.filter(function (l) { return sanLinkTypes.has(l.type); });

    // Build node set from filtered links
    var nodeSet = new Set();
    flowLinks.forEach(function (l) {
      nodeSet.add(typeof l.source === 'object' ? l.source.id : l.source);
      nodeSet.add(typeof l.target === 'object' ? l.target.id : l.target);
    });

    // Create sankey nodes
    var skNodes = [];
    var nodeMap = {};
    nodes.forEach(function (n) {
      if (nodeSet.has(n.id)) {
        nodeMap[n.id] = skNodes.length;
        skNodes.push({ name: n.label, type: n.type, id: n.id, orig: n });
      }
    });

    // Create sankey links with weight as value
    var skLinks = flowLinks.map(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        source: nodeMap[s],
        target: nodeMap[t],
        value: l.weight || 5,
        type: l.type
      };
    }).filter(function (l) {
      return l.source !== undefined && l.target !== undefined;
    });

    var container = document.getElementById('sankey-container');
    var w = container.clientWidth;
    var h = container.clientHeight;

    var skSvg = d3.select('#sankey-container').append('svg')
      .attr('width', w).attr('height', h);

    var skG = skSvg.append('g');

    // Zoom
    var zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', function (event) { skG.attr('transform', event.transform); });
    skSvg.call(zoom);

    var sankey = d3.sankey()
      .nodeWidth(14)
      .nodePadding(6)
      .extent([[10, 10], [w - 110, h - 10]]);

    var graph = sankey({
      nodes: skNodes.map(function (d) { return Object.assign({}, d); }),
      links: skLinks.map(function (d) { return Object.assign({}, d); })
    });

    var nodeColors = {
      country: '#f85149', company: '#58a6ff', mineral: '#3fb950',
      deposit: '#d29922', person: '#db61a8', regulatory: '#ff8c00'
    };

    // Links
    var linkPath = skG.append('g').attr('class', 'sankey-links')
      .selectAll('path')
      .data(graph.links)
      .enter().append('path')
      .attr('class', 'sankey-link')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', function (d) { return LINK_COLORS[d.type] || '#8b949e'; })
      .attr('stroke-width', function (d) { return Math.max(1, d.width); })
      .on('mouseover', function () { d3.select(this).attr('stroke-opacity', 0.6); })
      .on('mouseout', function () { d3.select(this).attr('stroke-opacity', 0.3); });

    // Nodes
    var node = skG.append('g').attr('class', 'sankey-nodes')
      .selectAll('g')
      .data(graph.nodes)
      .enter().append('g')
      .attr('class', 'sankey-node')
      .attr('transform', function (d) { return 'translate(' + d.x0 + ',' + d.y0 + ')'; });

    node.append('rect')
      .attr('height', function (d) { return Math.max(1, d.y1 - d.y0); })
      .attr('width', sankey.nodeWidth())
      .attr('fill', function (d) { return nodeColors[d.type] || '#8b949e'; })
      .on('click', function (event, d) {
        event.stopPropagation();
        showPanel(d.orig);
      })
      .append('title').text(function (d) { return d.name; });

    node.append('text')
      .attr('x', sankey.nodeWidth() + 4)
      .attr('y', function (d) { return (d.y1 - d.y0) / 2; })
      .attr('dy', '.35em')
      .attr('text-anchor', 'start')
      .text(function (d) { return d.name; })
      .filter(function (d) { return d.x0 > w / 2; })
      .attr('x', -4)
      .attr('text-anchor', 'end');

    // Responsive
    window.addEventListener('resize', function () {
      var nw = container.clientWidth, nh = container.clientHeight;
      skSvg.attr('width', nw).attr('height', nh);
    });
  }

  // View toggle handler
  var sankeyActive = false;
  document.getElementById('view-toggle-btn').addEventListener('click', function () {
    if (!sankeyActive) {
      document.getElementById('graph').classList.add('hidden');
      document.getElementById('sankey-container').classList.remove('hidden');
      document.getElementById('legend').classList.add('hidden');
      document.getElementById('controls').classList.add('hidden');
      this.textContent = 'Switch to Network';
      sankeyActive = true;
      initSankey();
    } else {
      document.getElementById('graph').classList.remove('hidden');
      document.getElementById('sankey-container').classList.add('hidden');
      document.getElementById('legend').classList.remove('hidden');
      document.getElementById('controls').classList.remove('hidden');
      this.textContent = 'Switch to Sankey';
      sankeyActive = false;
    }
  });

})();