class PolygonInstance {
  constructor() {
    this.props = {}; // Here props are readonly
    this.state = {};

    this.utils = {
      /**
       * Generate uuid v4 string
       * @returns {string}
       */
      uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      },

      /**
       * Append some html content to a target html element
       * @param targetElementSelector {string}
       * @param htmlContent {HTMLElement | string}
       */
      appendHtml(targetElementSelector, htmlContent) {

      }
    };
  };

  /**
   * @param stateProps {{
   *  [key: string]: value,
   * }}
   * @param callback {undefined | function}
   * @callback {function}
   * @returns {void}
   */
  setState(stateProps, callback = undefined) {
    this.state = {
      ...this.state,
      ...stateProps,
    };

    if (typeof callback === "function") {
      callback(this.state);
    }
  }
}

class PolygonEditor extends PolygonInstance {
  /**
   * @param props {{
   *  wrapperElementSelector?: string,
   *  backgroundImageSrc?: string,
   *  shapeOpacity?: number,
   *  shapeOpacity?: number,
   *  editorData?: {
   *   polygons: any[],
   *   markers: any[],
   * },
   *  confirmOnErase?: boolean,
   *  onChangeEditorData?: function,
   *  readOnly?: boolean,
   *  mounted?: function,
   *  startPoint?: number,
   *  markerProps: {
   *    singlePointer?: boolean,
   *    readOnly?: boolean,
   *    drawInsidePolygonOnly?: boolean,
   *    onDragStart?(): void,
   *    onDragEnd?(): void,
   *    onRemove?(): void,
   *    onAdd?(): void,
   *  },
   *  polygonProps: {
   *    readOnly?: boolean,
   *  },
   *  defaultEnabledTool?: "add-marker" | "add-polygon",
   * }}
   */
  constructor(props) {
    super();

    this.props = props;

    this.state = {
      wrapperElementSelector: props?.wrapperElementSelector ?? '.polygon-editor',
      backgroundImageSrc: props?.backgroundImageSrc,
      dragging: false,
      drawing: false,
      startPoint: props?.startPoint ?? undefined,
      svg: undefined,
      points: [],
      transformPoints: {
        x: 0,
        y: 0,
      },
      dragger: undefined,
      g: undefined,

      noToolsSelectedMode: true,
      readOnlyMode: props?.readOnly ?? false,
      drawMode: false,
      eraserMode: false,
      dragMode: false,
      markerMode: false,

      confirmOnErase: props?.confirmOnErase ?? true,

      marker: {
        singlePointer: props?.markerProps?.singlePointer ?? false,
        readOnlyMode: props?.markerProps?.readOnly ?? false,
        drawInsidePolygonOnly: props?.markerProps?.drawInsidePolygonOnly ?? false,
      },

      polygon: {
        readOnlyMode: props?.polygonProps?.readOnly ?? false,
      },

      shapeSettings: {
        shapeOpacity: props?.shapeOpacity ?? 0.4,
      },
    };

    this.editorData = props?.editorData ? props?.editorData : {
      polygons: [],
      markers: [],
    };

    this.editorToolsClassNames = {
      noToolsSelectedMode: 'no-tool-selected',
      readOnlyMode: 'readonly-mode',
      polygonReadOnlyMode: 'polygon-readonly-mode',
      markerReadOnlyMode: 'marker-readonly-mode',
      drawMode: 'draw-mode',
      eraserMode: 'eraser-mode',
      dragMode: 'drag-mode',
      markerMode: 'marker-mode',
    };

    this.editorOptionsClassNames = {
      drawMarkerInsidePolygonOnlyMode: 'draw-marker-inside-polygon-only',
    };

    this.init = this.init.bind(this);
    this.editorActivities = this.editorActivities.bind(this);
    this.markerActivities = this.markerActivities.bind(this);
    this.drawComponentWrapper = this.drawComponentWrapper.bind(this);
    this.drawPolygonShape = this.drawPolygonShape.bind(this);
    this.setMarker = this.setMarker.bind(this);
    this.drawSvgComponent = this.drawSvgComponent.bind(this);
    this.closePolygon = this.closePolygon.bind(this);
    this.getRandomColor = this.getRandomColor.bind(this);
    this.changeComponentBackground = this.changeComponentBackground.bind(this);
    this.handleSvgMouseUp = this.handleSvgMouseUp.bind(this);
    this.handleResizePointerDrag = this.handleResizePointerDrag.bind(this);
    this.handleSvgMouseMove = this.handleSvgMouseMove.bind(this);
    this.pointerResizeDragBehaviors = this.pointerResizeDragBehaviors.bind(this);
    this.populateEditorData = this.populateEditorData.bind(this);
    this.wrapperUnselectAllTools = this.wrapperUnselectAllTools.bind(this);
    this.prioritizePolygonOrMarker = this.prioritizePolygonOrMarker.bind(this);
    this.htmlTemplates = this.htmlTemplates.bind(this);

    this.setNoToolSelectedMode = this.setNoToolSelectedMode.bind(this);
    this.setEraserMode = this.setEraserMode.bind(this);
    this.setReadOnlyModeEditorClasses = this.setReadOnlyModeEditorClasses.bind(this);
    this.setReadOnlyMode = this.setReadOnlyMode.bind(this);
    this.setDrawMode = this.setDrawMode.bind(this);
    this.setDragMode = this.setDragMode.bind(this);
    this.setMarkerMode = this.setMarkerMode.bind(this);
    this.setMultipleMarkerMode = this.setMultipleMarkerMode.bind(this);
    this.setDrawMarkerInsidePolygonOnly = this.setDrawMarkerInsidePolygonOnly.bind(this);
    this.eraserActivities = this.eraserActivities.bind(this);
    this.setEditorData = this.setEditorData.bind(this);
    this.resetEditorData = this.resetEditorData.bind(this);
    this.clearAllPolygons = this.clearAllPolygons.bind(this);
    this.clearAllMarkers = this.clearAllMarkers.bind(this);
    this.getPolygons = this.getPolygons.bind(this);
    this.getMarkers = this.getMarkers.bind(this);
    this.getEditorData = this.getEditorData.bind(this);
  }

  /**
   * Initialize the instance
   * @return {void}
   */
  init() {
    const self = this;
    self.editorActivities();
  }

  /**
   * Prepare the editor wrapper
   * @return {void}
   */
  drawComponentWrapper() {
    const self = this;
    const { wrapperElementSelector, backgroundImageSrc } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    if (backgroundImageSrc) {
      wrapperElement.style.background = `url(${backgroundImageSrc})`;
    }
  }

  /**
   * Draw a svg component in the editor area
   * NB: This is not a polygon shape
   * @returns {*}
   */
  drawSvgComponent() {
    const self = this;
    const { wrapperElementSelector } = self.state;

    return d3.select(wrapperElementSelector).append('svg')
      .attr('height', '100%')
      .attr('width', '100%');
  }

  /**
   * Unselect all the wrapper tools
   * @return {void}
   */
  wrapperUnselectAllTools() {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    Object.keys(self.editorToolsClassNames).forEach(function (key, index) {
      const className = self.editorToolsClassNames[key];
      wrapperElement.classList.remove(className);

      // Uncheck all the states
      self.setState({
        [key]: false,
      });
    });
  }

  /**
   * Change the editor's background clip
   * @param imageSrc {string}
   * @param callback {function(targetInstance: any, imageInstance: any) | undefined}
   * @return {void}
   */
  changeComponentBackground(imageSrc, callback = undefined) {
    const self = this;
    const { wrapperElementSelector, backgroundImageSrc } = self.state;
    const wrapperElement = document.querySelector(`${wrapperElementSelector} svg`);

    if (backgroundImageSrc || imageSrc) {
      wrapperElement.style.background = `url(${imageSrc})`;
    }

    const bgImageInstance = new Image();
    bgImageInstance.src = imageSrc;
    bgImageInstance.onload = function () {
      wrapperElement.setAttribute('width', `${this.width}px`);
      wrapperElement.setAttribute('height', `${this.height}px`);

      if (typeof callback === "function") {
        callback(self, bgImageInstance);
      }
    };
  }

  /**
   * Generate random color codes as string
   * @returns {string}
   */
  getRandomColor() {
    let letters = '0123456789ABCDEF'.split('');
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * Close drawing the polygon shape
   * @return {void}
   */
  closePolygon() {
    const self = this;
    const { points, shapeSettings, transformPoints } = self.state;

    const polygonData = {
      fill: self.getRandomColor(),
      points,
      opacity: shapeSettings?.shapeOpacity,
      transformPoints,
    };

    // Append to the editor data for later usage
    self.editorData.polygons.push(polygonData);

    // Draw the polygon
    self.drawPolygonShape(polygonData);

    setTimeout(() => {
      self.populateEditorData(self.editorData);
    }, 10);
  }

  /**
   * Draw a polygon shape
   * @param data {{
   *  fill: string,
   *  opacity: number,
   *  points: any[],
   * }}
   * @param index {number}
   * @return {void}
   */
  drawPolygonShape(data, index = -1) {
    const self = this;
    const { svg, dragger } = self.state;
    const { points, fill, opacity } = data;
    let transformPoints = {
      x: 0,
      y: 0,
    };

    svg.select('g.drawPoly').remove();
    let g = svg.append('g');

    let polygon = g.append('polygon')
      .attr('points', points)
      .style('fill', fill)
      .style('opacity', opacity);

    if (index > -1) {
      g.attr('data-index', index);
      g.attr('class', 'polygon-item');

      let bbox = polygon._groups[0][0].getBBox();
      let bbox2 = g._groups[0][0].getBBox();


      bbox.x = 0;
      bbox.y = 0;
      bbox.width = 50;
      bbox.height = 50;

      let positionX = data?.transformPoints?.x;
      let positionY = data?.transformPoints?.y;

      g.datum({
        x: positionX ?? 0,
        y: positionY ?? 0
      });

      g.attr("transform", function (d) {
        const positionX = data?.transformPoints?.x ?? d.x;
        const positionY = data?.transformPoints?.y ?? d.y;
        transformPoints.x = positionX;
        transformPoints.y = positionY;
        return "translate(" + positionX + "," + positionY + ")";
      }).attr('data-translate-x', function (d) {
        const positionX = data?.transformPoints?.x ?? d.x;
        return positionX;
      }).attr('data-translate-y', function (d) {
        const positionY = data?.transformPoints?.y ?? d.y;
        return positionY;
      });


      // register the drag functionalities for this polygon element
      g.call(d3.drag().on("drag", function (d) {
        if (!self.state.dragMode || self.state.readOnlyMode || self.state.polygon.readOnlyMode || self.state.marker.drawInsidePolygonOnly) {
          return;
        }

        const x = d.x = d3.event.x;
        const y = d.y = d3.event.y;

        const gElement = d3.select(this);

        const gElementIndex = Number(gElement.attr('data-index'));

        if (gElementIndex > -1) {
          self.editorData.polygons[gElementIndex].transformPoints = { x, y };
        }

        gElement.attr("transform", "translate(" + x + "," + y + ")")
          .attr('data-translate-x', x)
          .attr('data-translate-y', y);
      }).on("end", function () {
        setTimeout(() => {
          self.populateEditorData(self.editorData);
        }, 5);
      }));
    }

    for (let i = 0; i < points.length; i++) {
      let circle = g.selectAll('circles')
        .data([points[i]])
        .enter()
        .append('circle')
        .attr('cx', points[i][0])
        .attr('cy', points[i][1])
        .attr('r', 4)
        .attr('fill', '#FDBC07')
        .attr('stroke', '#000')
        .attr('is-handle', 'true')
        .classed("handle", true)
        .style("cursor", "move");

      // register the circle pointer drag functionalities
      g.selectAll('circle').call(dragger);
    }

    self.setState({
      points: [],
      drawing: false,
      transformPoints: {
        x: 0,
        y: 0,
      },
    });
  }

  /**
   * Place a location marker point in the editor area
   * @param data {{
   *   offsetX: number,
   *   offsetY: number,
   * }}
   * @param callback {function(data: {
   *   offsetX: number,
   *   offsetY: number,
   * })} | undefined
   * @return {void}
   */
  setMarker(data, callback = undefined) {
    const self = this;
    const uuid = self.utils.uuidv4();
    const { svg } = self.state;

    svg.append('g')
      .attr('class', 'marker-point')
      .attr('data-id', uuid)
      .style('translate', `${data?.offsetX}px ${data?.offsetY}px`)
      .style('transform', 'scale(0.6)')
      .html(
        self.htmlTemplates().markerIcon()
      )
      .on('click', function () {
        if (self.state.readOnlyMode || self.state.marker.readOnlyMode) {
          return;
        }

        this?.remove();

        const elementIndex = self.editorData?.markers?.findIndex((m => {
          return Number(m?.offsetX) === Number(data?.offsetX) &&
            Number(m?.offsetY) === Number(data?.offsetY);
        }));

        if (elementIndex > -1) {
          // delete the data from the array in the state
          self.editorData.markers.splice(elementIndex, 1);

          // populate the whole editor data again
          self.populateEditorData(self.editorData);

          if (self.props?.markerProps?.onRemove) {
            self.props?.markerProps?.onRemove();
          }
        }
      })
      .call(d3.drag().on("drag", function () {
        if (self.state.readOnlyMode || self.state.marker.readOnlyMode) {
          return;
        }

        const x = d3.event.x - 5,
          y = d3.event.y - 5;

        d3.select(this)
          .attr("transform", "translate(" + x + "," + y + ")")
          .style('translate', `${x}px ${y}px`);

        const elementIndex = self.editorData?.markers?.findIndex((m => {
          return Number(m?.offsetX) === Number(data?.offsetX) &&
            Number(m?.offsetY) === Number(data?.offsetY);
        }));

        if (elementIndex > -1) {
          self.editorData.markers[elementIndex].offsetX = x;
          self.editorData.markers[elementIndex].offsetY = y;

          // populate the whole editor data again
          self.populateEditorData(self.editorData);

          if (self.props?.markerProps?.onDragStart) {
            self.props?.markerProps?.onDragStart();
          }
        }
      }).on("end", function () {
        if (self.props?.markerProps?.onDragEnd) {
          self.props?.markerProps?.onDragEnd();
        }
      }));

    if (typeof callback === "function") {
      callback(data);
    }
  }

  /**
   * Handle the polygon circle pointer drag and resize
   * @param referenceInstance {any}
   * @return {void}
   */
  handleResizePointerDrag(referenceInstance) {
    const self = this;
    const { drawing, drawMode, points: polyPoints } = self.state;

    if (drawing) {
      return;
    }

    let dragCircle = d3.select(referenceInstance), newPoints = [], circle;

    // Set dragging
    self.setState({
      dragging: true,
    });

    let g = d3.select(referenceInstance.parentNode);
    const poly = d3.select(referenceInstance.parentNode).select('polygon');
    const circles = d3.select(referenceInstance.parentNode).selectAll('circle');

    dragCircle.attr('cx', d3.event.x).attr('cy', d3.event.y);

    for (let i = 0; i < circles._groups[0].length; i++) {
      circle = d3.select(circles._groups[0][i]);
      newPoints.push([circle.attr('cx'), circle.attr('cy')]);
    }

    const gIndex = g?.attr('data-index');

    if (gIndex && Number(gIndex) > -1) {
      self.editorData.polygons[gIndex].points = newPoints;
    }

    // Set the points in the polygon
    poly.attr('points', newPoints);

    // Hit the onChange event if available
    if (typeof self.props.onChangeEditorData === "function") {
      self.props.onChangeEditorData(self.editorData);
    }
  }

  /**
   * SVG Element Mouse Up handler
   * @param referenceInstance {any}
   * @return {void}
   */
  handleSvgMouseUp(referenceInstance) {
    const self = this;
    const { dragging, svg, points, drawMode } = self.state;

    if (!drawMode || dragging || self.state.readOnlyMode) {
      return;
    }

    self.setState({
      drawing: true,
      startPoint: [d3.mouse(referenceInstance)[0], d3.mouse(referenceInstance)[1]],
    });


    if (svg.select('g.drawPoly').empty()) {
      self.setState({
        g: svg.append('g').attr('class', 'drawPoly'),
      });
    }

    if (d3.event.target.hasAttribute('is-handle')) {
      self.closePolygon();
      return;
    }

    points.push(d3.mouse(referenceInstance));
    self.state.g.select('polyline').remove();

    let polyline = self.state.g.append('polyline').attr('points', points)
      .style('fill', 'none')
      .attr('stroke', '#000');

    for (let i = 0; i < points.length; i++) {
      self.state.g.append('circle')
        .attr('cx', points[i][0])
        .attr('cy', points[i][1])
        .attr('r', 4)
        .attr('fill', 'yellow')
        .attr('stroke', '#000')
        .attr('is-handle', 'true')
        .style('cursor', 'pointer');
    }
  }

  /**
   * SVG Element Mouse move handler
   * @param referenceInstance {any}
   * @return {void}
   */
  handleSvgMouseMove(referenceInstance) {
    const self = this;
    const { drawing, startPoint, drawMode } = self.state;

    if (!drawing || !drawMode || self.state.readOnlyMode) {
      return;
    }

    let g = d3.select('g.drawPoly');

    g.select('line').remove();

    let line = g.append('line')
      .attr('x1', startPoint[0])
      .attr('y1', startPoint[1])
      .attr('x2', d3.mouse(referenceInstance)[0] + 2)
      .attr('y2', d3.mouse(referenceInstance)[1])
      .attr('stroke', '#53DBF3')
      .attr('stroke-width', 1);
  }

  /**
   * Polygon circle pointer drag events handler
   * @returns {*}
   */
  pointerResizeDragBehaviors() {
    const self = this;

    return d3.drag()
      .on('drag', function () {
        if (self.state.readOnlyMode || self.state.polygon.readOnlyMode || self.state.marker.drawInsidePolygonOnly) {
          return;
        }

        self.handleResizePointerDrag(this);
      }).on('end', function (d) {
        self.setState({ dragging: false });
      });
  }

  /**
   * Populate when we have some editor data
   * @param editorData {{
   *   polygons: any[],
   *   markers: any[],
   * }}
   * @return {void}
   */
  populateEditorData(editorData) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    self.setReadOnlyModeEditorClasses(wrapperElement, {
      all: self.state.readOnlyMode,
      polygon: self.state.polygon.readOnlyMode,
      marker: self.state.marker.readOnlyMode,
    });

    // Make the svg element empty as we are going to populate the array data from beginning
    wrapperElement.querySelector('svg').innerHTML = '';

    const { polygons, markers } = editorData;

    if ((polygons && polygons?.length > 0) || (markers && markers?.length > 0)) {
      if (polygons && polygons?.length > 0) {
        polygons?.forEach((data, index) => {
          self.drawPolygonShape(data, index);

          // Hit the onChange event if available
          if (typeof self.props.onChangeEditorData === "function") {
            self.props.onChangeEditorData(self.editorData);
          }

          setTimeout(function () {
            self.eraserActivities();
          }, 100);
        });
      }

      if (markers && markers?.length > 0) {
        markers?.forEach((marker) => {
          self.setMarker(marker);

          // Hit the onChange event if available
          if (typeof self.props.onChangeEditorData === "function") {
            self.props.onChangeEditorData(self.editorData);
          }
        });
      }

      return;
    }

    // Hit the onChange event if available
    if (typeof self.props.onChangeEditorData === "function") {
      self.props.onChangeEditorData(self.editorData);
    }
  }

  /**
   * Prioritize polygon elements or marker elements
   * Send to back-ward or front-ward the polygon/marker dom elements
   * @param priority {"polygons" | "markers"}
   * @return {void}
   */
  prioritizePolygonOrMarker(priority) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperSvgElement = document.querySelector(`${wrapperElementSelector} svg`);
    const polygonDomElements = document.querySelectorAll(`${wrapperElementSelector} .polygon-item`);
    const markerDomElements = document.querySelectorAll(`${wrapperElementSelector} .marker-point`);

    let svgGeneratedInnerHtmlAsString = '';

    if (priority === "polygons") {
      markerDomElements?.forEach((element) => {
        svgGeneratedInnerHtmlAsString += element?.outerHTML;
      });

      polygonDomElements?.forEach((element) => {
        svgGeneratedInnerHtmlAsString += element?.outerHTML;
      });
    } else if (priority === "markers") {
      polygonDomElements?.forEach((element) => {
        svgGeneratedInnerHtmlAsString += element?.outerHTML;
      });

      markerDomElements?.forEach((element) => {
        svgGeneratedInnerHtmlAsString += element?.outerHTML;
      });
    }

    wrapperSvgElement.innerHTML = svgGeneratedInnerHtmlAsString;

    // recall the eraser events to bind them also
    self.eraserActivities();
  }

  /**
   /**
   * Set the tools in the no tool selected mode
   * @return {void}
   */
  setNoToolSelectedMode() {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    // Unselect all the active tools
    self.wrapperUnselectAllTools();

    // add the no tool selected class name
    wrapperElement.classList.add(
      self.editorToolsClassNames.noToolsSelectedMode
    );

    self.setState({
      noToolsSelectedMode: true,
    });
  }

  /**
   * Set the readonly mode classes based on configurations or props
   * @param wrapperElement {HTMLElement}
   * @param options {{
   *   all?: boolean,
   *   marker?: boolean,
   *   polygon?: boolean,
   * }}
   */
  setReadOnlyModeEditorClasses(wrapperElement, options) {
    const self = this;

    function addRegularReadonlyClassName() {
      wrapperElement.classList.remove(
        self.editorToolsClassNames.readOnlyMode
      );
    }

    function removeRegularReadonlyClassName() {
      wrapperElement.classList.remove(
        self.editorToolsClassNames.readOnlyMode
      );
    }

    // Make readonly when set
    if (options?.all) {
      addRegularReadonlyClassName();
    }

    // Make the polygon items readonly when set
    if (options?.polygon) {
      removeRegularReadonlyClassName();

      wrapperElement.classList.add(
        self.editorToolsClassNames.polygonReadOnlyMode
      );
    }

    // Make the marker items readonly when set
    if (options?.marker) {
      removeRegularReadonlyClassName();

      wrapperElement.classList.add(
        self.editorToolsClassNames.markerReadOnlyMode
      );
    }
  }

  /**
   * Set the editor or editor elements readonly
   * No tools or selected tools will work in this mode
   * @param options {{
   *   all?: boolean,
   *   marker?: boolean,
   *   polygon?: boolean,
   * }}
   * @return {void}
   */
  setReadOnlyMode(options) {
    const self = this;

    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    self.setReadOnlyModeEditorClasses(wrapperElement, {
      all: options?.all,
      polygon: options?.polygon,
      marker: options?.marker,
    });

    if (options?.all || options?.polygon | options?.marker) {
      self.wrapperUnselectAllTools();
      if (options?.all) {
        wrapperElement.classList.add(
          self.editorToolsClassNames.readOnlyMode
        );
      }

      if (options?.polygon) {
        wrapperElement.classList.add(
          self.editorToolsClassNames.polygonReadOnlyMode
        );
      }

      if (options?.marker) {
        wrapperElement.classList.add(
          self.editorToolsClassNames.markerReadOnlyMode
        );
      }
    } else {
      self.setNoToolSelectedMode();
    }

    self.setState({
      readOnlyMode: options?.all ?? false,
      polygon: {
        ...self.state.polygon,
        readOnlyMode: options?.polygon ?? false,
      },
      marker: {
        ...self.state.marker,
        readOnlyMode: options?.marker ?? false,
      },
    });
  }

  /**
   * Activate the eraser tool
   * @param eraserMode {boolean}
   * @return {void}
   */
  setEraserMode(eraserMode = true) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    if (self.state.readOnlyMode) {
      return;
    }

    if (eraserMode) {
      self.wrapperUnselectAllTools();
      wrapperElement.classList.add(
        self.editorToolsClassNames.eraserMode
      );
    } else {
      self.setNoToolSelectedMode();
    }

    self.setState({
      eraserMode,
    });
  }

  /**
   * Active the draw mode
   * @param drawMode {boolean}
   * @return {void}
   */
  setDrawMode(drawMode = true) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    if (self.state.readOnlyMode || self.state.polygon.readOnlyMode) {
      return;
    }

    if (drawMode) {
      self.wrapperUnselectAllTools();
      wrapperElement.classList.add(
        self.editorToolsClassNames.drawMode
      );

    } else {
      self.setNoToolSelectedMode();
    }

    self.setState({
      drawMode,
    });
  }

  /**
   * Activate the drag mode
   * @param dragMode {boolean}
   * @return {void}
   */
  setDragMode(dragMode = true) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    if (self.state.readOnlyMode) {
      return;
    }

    if (dragMode) {
      self.wrapperUnselectAllTools();
      wrapperElement.classList.add(
        self.editorToolsClassNames.dragMode
      );
    } else {
      self.setNoToolSelectedMode();
    }

    self.setState({
      dragMode,
    });
  }

  /**
   * Activate the marker tool
   * @param markerMode {boolean}
   * @return {void}
   */
  setMarkerMode(markerMode = true) {
    const self = this;

    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    if (self.state.readOnlyMode) {
      return;
    }

    if (markerMode) {
      self.wrapperUnselectAllTools();
      wrapperElement.classList.add(
        self.editorToolsClassNames.markerMode
      );
      wrapperElement.classList.add(
        self.editorToolsClassNames.polygonReadOnlyMode
      );
    }

    self.setState({
      markerMode,
    });
  }

  /**
   * Set the marker mode to multiple to add multiple markers
   * @param multipleMarkers {boolean}
   * @return {void}
   */
  setMultipleMarkerMode(multipleMarkers = true) {
    const self = this;

    self.state.marker = {
      ...self.state.marker,
      singlePointer: multipleMarkers,
    };
  }

  /**
   * Enable/disable marker only on polygon shape
   * @param enabled {boolean}
   */
  setDrawMarkerInsidePolygonOnly(enabled = true) {
    const self = this;
    const { wrapperElementSelector } = self.state;
    const wrapperElement = document.querySelector(wrapperElementSelector);

    self.setState({
      marker: {
        ...self.state.marker,
        drawInsidePolygonOnly: enabled,
      },
    });

    const drawInsidePolygonOnlyClassName = this.editorOptionsClassNames.drawMarkerInsidePolygonOnlyMode;

    if (enabled) {
      wrapperElement.classList.add(
        drawInsidePolygonOnlyClassName
      );
    } else {
      wrapperElement.classList.remove(
        drawInsidePolygonOnlyClassName
      );
    }
  }

  /**
   * Eraser tool activities
   * @return {void}
   */
  eraserActivities() {
    const self = this;
    const { svg } = self.state;

    svg.selectAll('.polygon-item').on('click', function () {
      const element = this;

      if (self.state.polygon.readOnlyMode) {
        return;
      }

      if (self.state.eraserMode) {
        if (self.state.confirmOnErase) {
          confirmAction('Erase!', 'Are you sure to remove this polygon?', function () {

            const index = element.getAttribute('data-index');
            if (index > -1) {
              self.editorData.polygons.splice(index, 1);
            }

            element.remove();
            self.populateEditorData(self.editorData);

          });
        }
      }
    });
  }

  /**
   * Marker tool activities
   * @return {void}
   */
  markerActivities() {
    const self = this;
    const { svg } = self.state;

    svg.on('click', function () {
      if (self.state.markerMode) {

        if (self.state.marker.drawInsidePolygonOnly) {
          if (self.editorData.polygons.length > 0 && d3?.event?.target?.nodeName !== "polygon") {
            return;
          }
        }

        // disable when we should allow only one marker point
        if (self.state?.marker?.singlePointer && self?.editorData?.markers?.length > 0) {
          return;
        }

        // we disable setting location pin on a location pin icon
        if (!(
          d3.event.target.nodeName === "svg" ||
          d3.event.target.nodeName === "polygon"
        )) {

          // we hit the marker icon, so we remove it from the editor area
          return false;
        }

        const offsetX = d3?.event?.offsetX - 8;
        const offsetY = d3?.event?.offsetY - 25;

        const data = { offsetX, offsetY };

        // update the editor data as we are adding a new marker point
        setTimeout(() => {
          self.setMarker(data, (markerData) => {
            // update the editor data
            self.editorData.markers.push(markerData);

            // populate the whole editor data again
            self.populateEditorData(self.editorData);

            if (self.props?.markerProps?.onAdd) {
              self.props?.markerProps?.onAdd();
            }
          });
        }, 70);
      }
    });

    self.setDrawMarkerInsidePolygonOnly(
      self.state.marker.drawInsidePolygonOnly
    );
  }

  /**
   * Zoom activities for the entire editor area
   * @param input {{
   *   value: any,
   * } | HTMLInputElement}
   */
  zoomEditor(input) {
    const self = this;

    let currentZoomValue = input.value;
    const wrapperElement = document.querySelector(`${self.state.wrapperElementSelector} svg`);
    // wrapperElement.style.zoom = currentZoomValue;
    wrapperElement.style.top = '0';
    wrapperElement.style.transform = `scale(${currentZoomValue / 20})`;
    // wrapperElement.style.MozTransform = `scale(${currentZoomValue / 20})`;
    wrapperElement.style.left = '0';
  }

  /**
   * Polygon drag activities
   * @return {void}
   */
  polygonDragActivities() {

  }

  /**
   * Editor default activities on boot
   * @return {void}
   */
  editorActivities() {
    const self = this;

    // Draw the parent component wrapper using some styles
    self.drawComponentWrapper();


    self.setState({
      // Draw the svg component in the parent DOM
      svg: self.drawSvgComponent(),

      // Pointer resize drag behaviors
      dragger: self.pointerResizeDragBehaviors(),
    }, function (state) {
      const { svg } = state;
      const { editorData } = self;

      // Draw the polygons when we have some initial editor data
      if (editorData) {
        self.populateEditorData(editorData);
      }

      // Activities on mouse up
      svg.on('mouseup', function () {
        self.handleSvgMouseUp(this);
      });

      // Activities on mouse move
      svg.on('mousemove', function () {
        self.handleSvgMouseMove(this);
      });

      // Eraser activities
      self.eraserActivities();

      // Shape drag activities
      self.polygonDragActivities();

      // Marker Mode Activities
      self.markerActivities();

      if (self.props?.defaultEnabledTool) {
        switch (self.props.defaultEnabledTool) {
          case "add-marker" :
            self.setMarkerMode(
              self.props?.markerProps?.markerMode
            );
            break;
        }
      }

      // Run the mounted activities if found
      if (self.props.mounted && typeof self.props.mounted === "function") {
        self.props.mounted(self);
      }
    });
  }

  /**
   * Set the editor data in the instance
   * @param editorData {{
   *   polygons: any[],
   *   markers: any[],
   * }}
   * @param backgroundSrc {string | undefined}
   * @return {void}
   */
  setEditorData(editorData = { polygons: [], markers: [] }, backgroundSrc = undefined) {
    const self = this;
    let clonedEditorData = editorData ? editorData : {
      polygons: [],
      markers: [],
    };

    if (editorData) {
      self.editorData = clonedEditorData;
      self.backgroundImageSrc = '';

      self.populateEditorData(self.editorData);
    }

    if (backgroundSrc && backgroundSrc !== '') {
      self.changeComponentBackground(backgroundSrc);
    }
  }

  /**
   * Reset editor data
   * @return {void}
   */
  resetEditorData() {
    const self = this;
    self.setEditorData({
      polygons: [],
      markers: [],
    });
  }

  /**
   * Clear all polygons
   * @return {void}
   */
  clearAllPolygons() {
    const self = this;
    self.setEditorData({
      ...self.editorData,
      polygons: [],
    });
  }

  /**
   * Clear all markers
   * @return {void}
   */
  clearAllMarkers() {
    const self = this;
    self.setEditorData({
      ...self.editorData,
      markers: [],
    });
  }

  /**
   * Reset the editor
   * Clears editor data as well as the background clip
   * @return {void}
   */
  resetEditor() {
    const self = this;

    self.setEditorData({
      polygons: [],
      markers: [],
    });

    self.changeComponentBackground('');
  }

  /**
   * Get the polygons data
   * @return {*[]|[]|*}
   */
  getPolygons() {
    return this.editorData.polygons;
  }

  /**
   * Get the polygons data
   * @return {*[]|[]|*}
   */
  getMarkers() {
    return this.editorData.markers;
  }

  /**
   * Get editor data
   * @return {{polygons: *[], markers: *[]}|{polygons: [], markers: []}}
   */
  getEditorData() {
    return this.editorData;
  }

  /**
   * Contains a bunch of html/svg/xml nodes as string
   * @returns {{markerIcon: (function(): string)}}
   */
  htmlTemplates() {
    return {
      /**
       * Get the marker svg icon element as string
       * @returns {string}
       */
      markerIcon: () => `
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g transform="translate(-125.000000, -643.000000)">
            <g transform="translate(37.000000, 169.000000)">
              <g transform="translate(78.000000, 468.000000)">
                <g transform="translate(10.000000, 6.000000)">
                  <path d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z" id="Shape" fill="#ffffff"></path>
                  <circle id="Oval" fill="#ffffff" fill-rule="nonzero" cx="14" cy="14" r="7"></circle>
                </g>
              </g>
            </g>
          </g>
        </g>
      `,
    };
  }
}

function calculatePercentage(value) {
  if (Number(value) === 1) {
    return 0;
  }

  return Math.round((Number(value) / 50) * 100);
}
