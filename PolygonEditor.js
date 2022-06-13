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
     *  wrapperElementSelector: string,
     *  backgroundImageSrc: string,
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

            shapeSettings: {

            },
        };

        this.init = this.init.bind(this);
        this.editorActivities = this.editorActivities.bind(this);
        this.handleSvgMouseUp = this.handleSvgMouseUp.bind(this);
        this.handleResizePointerDrag = this.handleResizePointerDrag.bind(this);
        this.handleSvgMouseMove = this.handleSvgMouseMove.bind(this);
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
        const { svg, points, dragger } = self.state;

        svg.select('g.drawPoly').remove();
        let g = svg.append('g');

        g.append('polygon')
            .attr('points', points)
            .style('fill', self.getRandomColor())
            .style('opacity', '0.4');

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
        const { drawing } = self.state;

        if (drawing) {
            return;
        };

        let dragCircle = d3.select(referenceInstance), newPoints = [], circle;

        // Set dragging
        self.setState({
            dragging: true,
        });

        const poly = d3.select(referenceInstance.parentNode).select('polygon');
        const circles = d3.select(referenceInstance.parentNode).selectAll('circle');

        dragCircle.attr('cx', d3.event.x).attr('cy', d3.event.y);

        for (let i = 0; i < circles[0].length; i++) {
            circle = d3.select(circles[0][i]);
            newPoints.push([circle.attr('cx'), circle.attr('cy')]);
        }

        poly.attr('points', newPoints);
    }

    handleSvgMouseUp(referenceInstance) {
        const self = this;
        const { dragging, svg, points } = self.state;

        if (dragging) {
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
        const { drawing, startPoint } = self.state;

        if (!drawing) {
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

            svg.on('mouseup', function () {
                self.handleSvgMouseUp(this);
            });

            svg.on('mousemove', function () {
                self.handleSvgMouseMove(this);
            })
        });
    }
}

const POLYGON_EDITOR = new PolygonEditor({
    wrapperElementSelector: '.polygon-editor',
    backgroundImageSrc: 'https://www.thai-property-group.com/wp-content/uploads/2019/06/Plan-bureau-Bangkok.jpg',
});
POLYGON_EDITOR.init();