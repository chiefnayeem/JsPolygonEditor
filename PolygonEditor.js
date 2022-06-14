class PolygonInstance {
    constructor() {
        this.props = {}; // Here props are readonly
        this.state = {};
    };

    /** 
     * @param stateProps {{
     *  [key]: value,
     * }}
     * @callback {function}
     * @returns {void}
     */
    setState(stateProps, callback) {
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
     *  editorData?: any[],
     *  confirmOnErase?: boolean,
     *  onChangeEditorData?: function,
     * }}
     */
    constructor(props) {
        super();

        this.props = props;

        this.state = {
            wrapperElementSelector: props?.wrapperElementSelector ?? '.polygon-editorX',
            backgroundImageSrc: props?.backgroundImageSrc,
            dragging: false,
            drawing: false,
            startPoint: props?.startPoint ?? undefined,
            svg: undefined,
            points: [],
            dragger: undefined,
            g: undefined,

            eraserMode: false,
            confirmOnErase: props?.confirmOnErase ?? true,

            shapeSettings: {
                shapeOpacity: props?.shapeOpacity ?? 0.4,
            },
        };

        this.editorData = props?.editorData && props?.editorData?.length > 0 ? props?.editorData : [];

        this.init = this.init.bind(this);
        this.editorActivities = this.editorActivities.bind(this);
        this.drawComponentWrapper = this.drawComponentWrapper.bind(this);
        this.drawPolygonShape = this.drawPolygonShape.bind(this);
        this.drawSvgComponent = this.drawSvgComponent.bind(this);
        this.closePolygon = this.closePolygon.bind(this);
        this.getRandomColor = this.getRandomColor.bind(this);
        this.changeComponentBackground = this.changeComponentBackground.bind(this);
        this.handleSvgMouseUp = this.handleSvgMouseUp.bind(this);
        this.handleResizePointerDrag = this.handleResizePointerDrag.bind(this);
        this.handleSvgMouseMove = this.handleSvgMouseMove.bind(this);
        this.pointerResizeDragBehaviors = this.pointerResizeDragBehaviors.bind(this);
        this.populateEditorData = this.populateEditorData.bind(this);
        this.setEraserMode = this.setEraserMode.bind(this);
    }

    init() {
        const self = this;
        self.editorActivities();
    }

    drawComponentWrapper() {
        const self = this;
        const { wrapperElementSelector, backgroundImageSrc } = self.state;
        const wrapperElement = document.querySelector(wrapperElementSelector);

        if (backgroundImageSrc) {
            wrapperElement.style.background = `url(${backgroundImageSrc})`;
        }
    }

    drawSvgComponent() {
        const self = this;
        const { wrapperElementSelector } = self.state;

        return d3.select(wrapperElementSelector).append('svg')
            .attr('height', '100%')
            .attr('width', '100%');
    }

    changeComponentBackground(imageSrc) {
        const self = this;
        const { wrapperElementSelector, backgroundImageSrc } = self.state;
        const wrapperElement = document.querySelector(wrapperElementSelector);

        if (backgroundImageSrc) {
            wrapperElement.style.background = `url(${imageSrc})`;
        }
    }

    getRandomColor() {
        let letters = '0123456789ABCDEF'.split('');
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    closePolygon() {
        const self = this;
        const { points, shapeSettings } = self.state;

        const polygonData = {
            fill: self.getRandomColor(),
            points,
            opacity: shapeSettings?.shapeOpacity,
        };

        // Append to the editor data for later usage
        self.editorData.push(polygonData);

        // Draw the polygon
        self.drawPolygonShape(polygonData);

        setTimeout(() => {
            self.populateEditorData(self.editorData);
        }, 10);

        // Hit the onChange event if available
        if (typeof self.props.onChangeEditorData === "function") {
            self.props.onChangeEditorData(self.editorData);
        }
    }

    /**
     * Draw a polygon shape
     * @param data {{
     *  fill: string,
     *  opacity: number,
     *  points: any[],
     * }} 
     * @param index {number}
     */
    drawPolygonShape(data, index = null) {
        const self = this;
        const { svg, dragger } = self.state;
        const { points, fill, opacity } = data;

        svg.select('g.drawPoly').remove();
        let g = svg.append('g');

        g.append('polygon')
            .attr('points', points)
            .style('fill', fill)
            .style('opacity', opacity);

        if (index > -1) {
            g.attr('data-index', index);
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
                .style({ cursor: 'move' })
                .call(dragger);
        }

        self.setState({
            points: [],
            drawing: false,
        });
    }

    handleResizePointerDrag(referenceInstance) {
        const self = this;
        const { drawing, eraserMode } = self.state;

        if (drawing || eraserMode) {
            return;
        };

        let dragCircle = d3.select(referenceInstance), newPoints = [], circle;

        // Set dragging
        self.setState({
            dragging: true,
        });

        let g = d3.select(referenceInstance.parentNode);
        const poly = d3.select(referenceInstance.parentNode).select('polygon');
        const circles = d3.select(referenceInstance.parentNode).selectAll('circle');

        dragCircle.attr('cx', d3.event.x).attr('cy', d3.event.y);

        for (let i = 0; i < circles[0].length; i++) {
            circle = d3.select(circles[0][i]);
            newPoints.push([circle.attr('cx'), circle.attr('cy')]);
        }

        const gIndex = g?.attr('data-index');

        if (gIndex && Number(gIndex) > -1) {
            self.editorData[gIndex].points = newPoints;
        }

        // Set the points in the polgon
        poly.attr('points', newPoints);

        // Hit the onChange event if available
        if (typeof self.props.onChangeEditorData === "function") {
            self.props.onChangeEditorData(self.editorData);
        }
    }

    handleSvgMouseUp(referenceInstance) {
        const self = this;
        const { dragging, svg, points, eraserMode } = self.state;

        if (eraserMode || dragging) {
            return;
        };

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
        };

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
                .style({ cursor: 'pointer' });
        }
    }

    handleSvgMouseMove(referenceInstance) {
        const self = this;
        const { drawing, startPoint, eraserMode } = self.state;

        if (!drawing || eraserMode) {
            return;
        };

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

    pointerResizeDragBehaviors() {
        const self = this;

        return d3.behavior.drag()
            .on('drag', function () {
                self.handleResizePointerDrag(this);
            }).on('dragend', function (d) {
                self.setState({ dragging: false });
            });
    }

    /**
     * Populate when we have some editor data
     * @param editorData {any[]}
     */
    populateEditorData(editorData) {
        const self = this;
        const { wrapperElementSelector } = self.state;
        const wrapperElement = document.querySelector(wrapperElementSelector);

        if (editorData && editorData?.length > 0) {
            // Make the svg element empty as we are going to populate the array data from beginning
            wrapperElement.querySelector('svg').innerHTML = '';

            editorData?.forEach((data, index) => {
                self.drawPolygonShape(data, index);
            });
        }
    }

    setEraserMode(eraserMode = true) {
        const self = this;

        self.setState({
            eraserMode,
        });
    }

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
            if (editorData && editorData?.length > 0) {
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

            // Erase polygons

            svg.select('g').on('click', function () {
                const element = this;

                if (self.state.eraserMode) {
                    if(self.state.confirmOnErase) {
                        if(!window.confirm("Are you sure to remove this polygon?")) {
                            return;
                        }
                    }

                    element.remove();
                }
            });
        });
    }
}