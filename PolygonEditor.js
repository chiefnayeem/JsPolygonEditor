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
    }
}

class PolygonEditor extends PolygonInstance {
    /**
     * @param props {{
     *  wrapperElementSelector: string,
     * }}
     */
    constructor(props) {
        super();

        this.props = props;

        this.state = {
            wrapperElementSelector: props?.wrapperElementSelector ?? '.polygon-editorX',
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
    }

    init() {
        const self = this;
        self.editorActivities();
    }

    drawComponentWrapper() {
        const self = this;
        const { wrapperElementSelector } = self.state;
        const wrapperElement = document.querySelector(wrapperElementSelector);
    }

    drawSvgComponent() {
        const self = this;
        const { wrapperElementSelector } = self.state;
        const wrapperElement = document.querySelector(wrapperElementSelector);

        return d3.select(wrapperElementSelector).append('svg')
            .attr('height', wrapperElement?.style?.height)
            .attr('width', wrapperElement?.style?.width);
    }

    editorActivities() {
        const self = this;

        self.setState({
            svg: self.drawSvgComponent(),
        });


        // behaviors
        // var dragger = d3.behavior.drag()
        //     .on('drag', handleDrag)
        //     .on('dragend', function (d) {
        //         dragging = false;
        //     });
    }
}

const POLYGON_EDITOR = new PolygonEditor({
    wrapperElementSelector: '.polygon-editor',
});
POLYGON_EDITOR.init();