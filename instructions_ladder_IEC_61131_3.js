module.exports = function (RED) {
    const registry = require("./registry");
    // ─── Helpers ──────────────────────────────────────────────────────────────

    function resolveValue(node, msg, type, key) {
        if (key === undefined || key === '') return undefined;
        switch (type) {
            case 'msg': return RED.util.getMessageProperty(msg, key);
            case 'flow': return node.context().flow.get(key);
            case 'global': return node.context().global.get(key);
            case 'num': return Number(key);
            case 'bool': return key === 'true' || key === true;
            case 'str': return String(key);
            default: return key;
        }
    }


    // Formats a value for status: rounds floats to 4 decimal places
    function fmt(v) {
        if (typeof v === 'number' && !Number.isInteger(v)) return +v.toFixed(4);
        return v;
    }

    // ─── Status builder ───────────────────────────────────────────────────────
    //
    // Node-RED status text is a single string — no real newline.
    // We simulate two logical lines with a  ‖  separator:
    //   Line 1: instruction mnemonic + operand variable names
    //   Line 2: resolved values + result/output
    //
    // ExampLT:
    //   NO (payload)  ‖  val=true → TRUE
    //   GT (temp) > (limit)  ‖  85 > 80 → TRUE
    //   ADD (a) + (b) → (result)  ‖  10 + 5 = 15
    //   SET → (motor)  ‖  (motor) = true

    // ─── Status builder ───────────────────────────────────────────────────────
    //
    // Format: FN varA(valA)op varB(valB)→dest=result  (no spaces, max compact)
    //
    // Examples:
    //   NO  motor_run(true)→TRUE
    //   GT  temp(85)>limit(80)→TRUE
    //   ADD a(10)+b(5)→result=15
    //   DIV x(9)/y(0)→÷0ERR
    //   MOV src(42)→dest
    //   ABS |x(-7)|→out=7
    //   SET →motor=TRUE
    //   RST →alarm=FALSE

    function buildStatus(fn, nameA, nameB, nameDest, valA, valB, result, computed) {
        const nA = nameA || '?';
        const nB = nameB || '?';
        const nD = nameDest || '?';
        const vA = fmt(valA);
        const vB = fmt(valB);
        const res = result ? 'TRUE' : 'FALSE';

        let fill
        let shape
        let text = `${fn} executed`;

        // ── Contacts ─────────────────────────────────────────────────────────
        if (fn === 'NO' || fn === 'NC') {
            text = `${fn} ${nA}(${vA})→${res}`;
        }

        // ── Comparators ──────────────────────────────────────────────────────
        const OPS = { EQ: '==', NEQ: '!=', GT: '>', GE: '>=', LT: '<', LE: '<=' };
        if (OPS[fn]) {
            text = `${fn} ${nA}(${vA})${OPS[fn]}${nB}(${vB})→${res}`;
        }

        // ── Math (two operands) ───────────────────────────────────────────────
        const MATH2 = { ADD: '+', SUB: '-', MUL: '*', DIV: '/', MOD: '%' };
        if (MATH2[fn]) {
            if ((fn === 'DIV' || fn === 'MOD') && Number(valB) === 0) {
                text = `${fn} ${nA}(${vA})${MATH2[fn]}${nB}(0)→÷0ERR`;
            } else {
                text = `${fn} ${nA}(${vA})${MATH2[fn]}${nB}(${vB})→${nD}=${fmt(computed)}`;
            }
        }

        // ── Math (one operand) ────────────────────────────────────────────────
        if (fn === 'MOV') {
            text = `MOV ${nA}(${vA})→${nD}`;
        }

        if (fn === 'ABS') {
            text = `ABS |${nA}(${vA})|→${nD}=${fmt(computed)}`;
        }

        if (fn === 'SQR') {
            text = `SQR √${nA}(${vA})→${nD}=${fmt(computed)}`;
        }

        // ── Output Coils ──────────────────────────────────────────────────────
        if (fn === 'SET') {
            text = `SET →${nD}=TRUE`;
        }

        if (fn === 'RESET') {
            text = `RST →${nD}=FALSE`;
        }

        if (fn === 'CTU') {
            text = `CTU→CV(${result.CV})=${result.Q}`;
        }

        //Build color
        if (fn == "CTU") {
            fill = result.Q ? 'green' : 'grey';
            shape = result.Q ? 'dot' : 'ring';

        } else {
            fill = result ? 'green' : 'grey';
            shape = result ? 'dot' : 'ring';
        }




        return {
            text: text,
            fill: fill,
            shape: shape
        }
    }

    // ─── Instruction Execution ────────────────────────────────────────────────

    function executeLadder(node, msg, config) {

        const fn = config.ladderFunc;
        const valA = resolveValue(node, msg, config.srcAType, config.srcA);
        const valB = resolveValue(node, msg, config.srcBType, config.srcB);
        const valC = resolveValue(node, msg, config.srcCType, config.srcC);



        const nameA = config.srcA || '';
        const nameB = config.srcB || '';
        const nameC = config.srcC || '';

        const nameDest = config.dest || '';
        const nameDestB = config.destB || '';

        let payload = null;
        let result = false;
        let resultB = false;
        let sendMsg = true;
        let Msg = true;
        let computed; // for math instructions that produce a new value
        var resultOperation = false

        switch (fn) {

            // ── Contacts ─────────────────────────────────────────────────────
            case 'NO': result = !!valA; sendMsg = result; break;
            case 'NC': result = !valA; sendMsg = result; break;

            // ── Comparators ──────────────────────────────────────────────────
            case 'EQ': result = Number(valA) === Number(valB); sendMsg = result; break;
            case 'NEQ': result = Number(valA) !== Number(valB); sendMsg = result; break;
            case 'GT': result = Number(valA) > Number(valB); sendMsg = result; break;
            case 'GE': result = Number(valA) >= Number(valB); sendMsg = result; break;
            case 'LT': result = Number(valA) < Number(valB); sendMsg = result; break;
            case 'LE': result = Number(valA) <= Number(valB); sendMsg = result; break;

            // ── Math (two operands) ───────────────────────────────────────────
            case 'ADD':
                computed = Number(valA) + Number(valB);
                result = computed;
                resultOperation = true
                break;
            case 'SUB':
                computed = Number(valA) - Number(valB);

                result = computed;
                resultOperation = true
                break;
            case 'MUL':
                computed = Number(valA) * Number(valB);
                result = computed;
                resultOperation = true
                break;
            case 'MOD':
                if (Number(valB) === 0) { node.warn('MOD: Division by zero!'); result = false; break; }
                computed = Number(valA) % Number(valB);

                result = computed;
                resultOperation = true
                break;
            case 'DIV':
                if (Number(valB) === 0) { node.warn('DIV: Division by zero!'); result = false; break; }
                computed = Number(valA) / Number(valB);

                result = computed;
                resultOperation = true
                type = "Math"
                break;

            // ── Math (one operand) ────────────────────────────────────────────
            case 'MOV':
                result = valA;
                resultOperation = true
                break;
            case 'ABS':
                computed = Math.abs(Number(valA));
                result = computed;
                resultOperation = true
                break;
            case 'SQR':
                computed = Math.sqrt(Math.abs(Number(valA)));
                result = computed;
                resultOperation = true
                break;

            // ── Output Coils ──────────────────────────────────────────────────
            case 'SET':
                resultOperation = true
                result = true;
                break;
            case 'RESET':
                result = false;
                resultOperation = true
                break;

            case 'CTU':
                // SET VALUE
                var memory = registry.getMemory(node)
                if (valA === true) {
                    var memory = registry.getMemory(node)
                    //Set memory
                    if (memory) {
                        memory = memory + 1
                        registry.setMemory(node, memory)
                    } else {
                        memory = 1
                        registry.setMemory(node, memory)
                    }
                }

                if(memory === undefined){
                    memory = 0;
                }

                //RESET
                if (valB === true) {
                    memory = 0
                    registry.setMemory(node, memory)
                }


                //set result
                if (memory >= valC) {
                    result = {
                        Q: true,
                        CV: memory
                    }

                    resultOperation = true

                } else {
                    resultOperation = true
                    result = {
                        Q: false,
                        CV: memory
                    }
                }

                break;

            default:
                node.warn('Unknown instruction: ' + fn);
                result = false;
        }

        const statusConfig = buildStatus(fn, nameA, nameB, nameDest, valA, valB, result, computed);
        return { result, resultOperation, statusConfig, sendMsg };
    }

    function writeNode(node, msg, config, sendMsg, result, resultOperation) {


        const ladderFunc = config.ladderFunc;
        const dest = config.dest;
        const destType = config.destType;

        switch (destType) {
            case 'msg':
                if (resultOperation) {
                    msg[dest] = result
                }
                break;
            case 'flow': node.context().flow.set(dest, result); break;
            case 'global': node.context().global.set(dest, result); break;
        }


        if (sendMsg) {
            node.send(msg);

        }
    }

    

    // ─── Node Definition ──────────────────────────────────────────────────────

    function instructions_ladder_IEC_61131_3(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.status({ fill: 'grey', shape: 'ring', text: 'waiting...' });

        node.on('input', function (msg) {
            try {
                const { result, resultOperation, statusConfig, sendMsg } = executeLadder(node, msg, config);

                node.status({
                    fill: statusConfig.fill,
                    shape: statusConfig.shape,
                    text: statusConfig.text,
                });

                msg.ladder = { func: config.ladderFunc, result, status: statusConfig };
                //Write payload and msg
                writeNode(node, msg, config, sendMsg, result, resultOperation)


            } catch (err) {
                node.error('Ladder execution error: ' + err.message, msg);
                node.status({ fill: 'red', shape: 'dot', text: 'Error: ' + err.message });
            }
        });

        node.on('close', function () { node.status({}); });
    }

    RED.nodes.registerType('instructions-ladder-iec-61131-3', instructions_ladder_IEC_61131_3);
};