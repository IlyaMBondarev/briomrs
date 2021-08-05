let data = null;
let dataError = false;
let speedOfSignal = 1000; // скорость сигнала в условных км/с
let defaultFault = 0.01; // погрешность по умолчанию 1%
let padding = 1000; // отступы на рисунке

let pathToAPI = 'https://github.com/IlyaMBondarev/briomrs/blob/d1c35d79519568bc0e22cce424f75131de0a0159/api.json';
 
/**
 * Функция предназначена для округления числа до нужного количества чисел после запятой
 * @param {number || string} num число, которое нужно преобразовать
 * @param {int number} digits количество чисел, которые необходимо оставить после запятой. По умолчанию 3
 * @returns Преобразованное число
 */
function round(num, digits = 3) {
    if (digits < 1) return parseInt(num);

    return parseFloat(num.toFixed(digits));
}

/**
 * 
 * @param {Array} transmitterCoords координаты передатчика в разные моменты времени
 * @param {Array} sensors координаты 
 * @returns 
 */
function countTimestamps(transmitterCoords, sensors) {
    let timestamps = [];
    transmitterCoords.forEach((coords) => {
        const timestamp = [];
        sensors.forEach(sensor => {
            let r = (Math.sqrt(Math.pow((+coords.x - sensor.x), 2) + Math.pow((+coords.y - sensor.y), 2))) / speedOfSignal;
            timestamp.push(r);
        })
        timestamps = [ ...timestamps, timestamp ];
    })
    return timestamps
}

/**
 * Функция вычисляет местонахождение передатчика в каждый момент времени
 * @param {Array} timestamps массив объектов, содержащих время прохождения сигнала от передатчика до приёмников
 * @param {Object} s1 координаты первого сенсора
 * @param {Object} s2 координаты второго сенсора
 * @param {Object} s3 координаты третьего сенсора
 * @param {Number} fault значение погрешности от 0 до 1
 * @returns массив объектов с координатами и радиусом наибольшей погрешности
 */
function countCoordsOfTransmitter(timestamps, s1, s2, s3, fault = defaultFault) {
    let path = [];
    timestamps.forEach(timestamp => {
        let coords = {};
        timestamp = timestamp.map(time => time *= speedOfSignal);
        
        let [ r1, r2, r3 ] = [ Math.pow(timestamp[0], 2), Math.pow(timestamp[1], 2), Math.pow(timestamp[2], 2) ];

        coords.x = ((s1.y - s2.y)*(s2.y*s2.y - s3.y*s3.y + s2.x*s2.x - s3.x*s3.x + r3 - r2) - (s2.y - s3.y)*(s1.y*s1.y - s2.y*s2.y + s1.x*s1.x - s2.x*s2.x + r2 - r1)) / (2*((s2.x - s3.x)*(s1.y - s2.y) - (s1.x -s2.x)*(s2.y - s3.y)));
        coords.y = (r1 - r2 - s1.x*s1.x + s2.x*s2.x - s1.y*s1.y + s2.y*s2.y + 2*coords.x*(s1.x - s2.x)) / (2*(s2.y - s1.y));

        coords.fault = Math.max( ...timestamp.map(s => s *= fault) );

        path = [ ...path, coords ];
    })
    return path;
}

/**
 * Предназначен для отрисовки пути
 */
class Renderer {
    constructor(canvasEl, listEl, data) {
        this.canvasEl = canvasEl;
        this.listEl = listEl;
        this.sensors = [ data.sensor1Coords, data.sensor2Coords, data.sensor3Coords ];
        this.path = [ ...data.path ];
        this.sensorSettings = {
            radius: 5,
            color: 'green',
        };
        this.pathSettings = {
            radius: 3,
            color: 'black',
        };
        this.faultSettings = {
            color: '#00000030',
        };
        this.zoom = this.canvasEl.clientHeight / data.minZoom;
        this.leftCoord = data.leftCoord;
        this.topCoord = data.topCoord;
        this.ctx = canvasEl.getContext("2d");
    }

    /**
     * Функция задает начальные параметры и начинает отрисовку
     */
    init() {
        this.canvasEl.height = this.canvasEl.clientHeight;
        this.canvasEl.width = this.canvasEl.clientWidth;
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillRect(0, 0,  this.canvasEl.clientWidth,  this.canvasEl.clientHeight);
        this.drawSensors();
        this.drawPath();
    }

    /**
     * Функиция отрисовывает местонахождение приёмников
     */
    drawSensors() {
        this.sensors.forEach((sensor, i) => {
            this.drawCircle((sensor.x - this.leftCoord) * this.zoom, (sensor.y - this.topCoord) * this.zoom, this.sensorSettings.color, this.sensorSettings.radius);
            
            this.ctx.font = "14px bold";
            this.ctx.fillStyle = 'green';
            this.ctx.fillText(`приёмник ${i+1}`, (sensor.x - this.leftCoord) * this.zoom + this.sensorSettings.radius - 40, (sensor.y - this.topCoord) * this.zoom - this.sensorSettings.radius - 10);
        })
    }

    /**
     * Функция отрисовывает путь передатчика
     */
    drawPath() {
        this.listEl.innerHTML = '';

        this.path.forEach((currDot, i) => {
            // понятно, конечно, что должен быть открытый канал, 
            // по которому каждую секунду передается местонахождение передатчика,
            // но, так как канала нет, я создал его искусственно
            setTimeout(() => {
                if (i != 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo((this.path[i-1].x - this.leftCoord) * this.zoom, (this.path[i-1].y - this.topCoord) * this.zoom);
                    this.ctx.lineTo((currDot.x - this.leftCoord) * this.zoom, (currDot.y - this.topCoord) * this.zoom);
                    this.ctx.lineWidth = 1;
                    this.ctx.closePath();
                    this.ctx.stroke();
                }
                this.drawCircle((currDot.x - this.leftCoord) * this.zoom, (currDot.y - this.topCoord) * this.zoom, this.pathSettings.color, this.pathSettings.radius);
                this.drawCircle((currDot.x - this.leftCoord) * this.zoom, (currDot.y - this.topCoord) * this.zoom, this.faultSettings.color, this.pathSettings.radius * currDot.fault * this.zoom);

                this.ctx.font = "14px bold";
                this.ctx.fillStyle = 'blue';
                this.ctx.fillText(`${i+1}`, (currDot.x - this.leftCoord) * this.zoom + this.pathSettings.radius - 10, (currDot.y - this.topCoord) * this.zoom - this.pathSettings.radius - 10);

                this.listEl.innerHTML += `<li> { ${round(currDot.x)}; ${round(currDot.y)} } </li>`;
            }, i * 1000)
        })
    }

    /**
     * Функция отрисовывает круг
     * @param {Number} x координата x центра круга
     * @param {Number} y координата y центра круга
     * @param {String} color цвета заливки круга
     * @param {Number} radius радиус круга
     */
    drawCircle(x, y, color, radius) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc( x, y, radius, 0, 2 * Math.PI );
        this.ctx.fill();
    }
}

/**
 * Функция получает данные с сервера, производит вычисления, необходимые для отрисовки и инициализирует отрисовку
 */
function getData() {
    fetch(pathToAPI)
        .then(response => {
            return response.json();
        })
        .then(json => {
            data = json;

            // вычисление времени прохождения сигналов по формуле окружности 
            // (для удобства я взял точки, с которых приходят сигналы, посчитал время пути сигнала и по этим данным выполнил задание)
            data.timestamps = [ ...countTimestamps(data.transmitterCoords, [ data.sensor1Coords, data.sensor2Coords, data.sensor3Coords ]) ];

            // выполнение самого задания

            // вычисление местонахождения передатчика в каждый момент времени
            data.path = countCoordsOfTransmitter(data.timestamps, data.sensor1Coords, data.sensor2Coords, data.sensor3Coords);

            // вычисление размеров и масштаба будущего холста
            const minX = Math.min( data.sensor1Coords.x, data.sensor2Coords.x, data.sensor3Coords.x, ...data.path.map(dot => dot = dot.x) ) - padding;
            const maxX = Math.max( data.sensor1Coords.x, data.sensor2Coords.x, data.sensor3Coords.x, ...data.path.map(dot => dot = dot.x) ) + padding;
            const minY = Math.min( data.sensor1Coords.x, data.sensor2Coords.x, data.sensor3Coords.x, ...data.path.map(dot => dot = dot.y) ) - padding;
            const maxY = Math.max( data.sensor1Coords.y, data.sensor2Coords.y, data.sensor3Coords.y, ...data.path.map(dot => dot = dot.y) ) + padding;

            data.minZoom = Math.max( maxX - minX, maxY - minY );
            data.leftCoord = minX;
            data.topCoord = minY;
            
            // инициализация отрисовки
            const renderer = new Renderer(
                document.getElementById("canvas"),
                document.getElementById("dots-list"),
                data
            );
              
            renderer.init();
        })
        .catch(function () {
            dataError = true;
            console.error('Ошибка');
        })
}

// кнопка загружает данные
let startButton = document.getElementById('startButton');

startButton.addEventListener('click', () => {
    getData();
    startButton.style.display = 'none';
})