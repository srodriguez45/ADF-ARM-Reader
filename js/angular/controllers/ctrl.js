/*
 * Base controladores Angular
 * Author: Assert Solutions - Steven Rodriguez
 */

app.controller('ARMCtrl', ['$scope', ($scope) => {

    //Inicializar tooltips
    $('[data-toggle="tooltip"]').tooltip();

    // Tipos
    var dataFactoryTypeName = "Microsoft.DataFactory/factories/";

    var IrName = "integrationRuntimes";

    var types = {
        dataset: dataFactoryTypeName + "datasets",
        pipeline: dataFactoryTypeName + "pipelines",
        linkedService: dataFactoryTypeName + "linkedServices",
        integrationRuntimes: dataFactoryTypeName + IrName,
    }

    var IRParameter = {
        type: "string",
        metadata: "Integration Runtime",
        defaultValue: "IR-Name"
    };

    var iRArray = [];

    // Campos
    var field = "resources";

	//iniciamos las variables
	$scope.content = {
        value: "",
        title: "",
        error: ""
    };

    initVars();

    $scope.valid = true;
 

    /**
     * Función que se lanza a través del evento del botón Generar ARM Template
     */   
    $scope.generar = () => {

        initVars();

        try {

            // generamos el objeto a partir del valor
            $scope.content.obj = JSON.parse($scope.content.value);

            if(typeof $scope.content.obj[field] != 'undefined' && $scope.content.obj[field].length > 0 && $scope.content.title != "") {

                // Guardamos la cantidad de recursos encontrados
                $scope.content.allResources = $scope.content.obj[field].length;
                // Consultamos el PL principal
                $scope.content.pipelinePrincipal = getActivityByName(
                    $scope.content.obj, $scope.content.title, types.pipeline
                );
                // generamos un objeto result y lo completamos
                // con el objeto convertido, luego pasamos a setear
                // los campos resources y parameters
                $scope.content.result = $scope.content.obj;
                // Incluimos los resources que encontramos en deps
                $scope.content.result[field] = $scope.content.deps;
                // Incluimos el Pipeline principal si se selecciona la opción
                if($scope.content.addPrincipal) {
                    $scope.content.result[field].push($scope.content.pipelinePrincipal);
                }
                // Incluimos los parametros y agregamos los adicionales
                $scope.content.result.parameters = getParameters($scope.content.obj);
                // Generamos un parseo del json a string con 4 espacios
                $scope.content.resultParse = JSON.stringify(
                    $scope.content.result, null, 4
                );
                // Parseamos el json del pipeline principal a string
                $scope.content.pipelinePrincipalParse = JSON.stringify(
                    $scope.content.pipelinePrincipal, null, 4
                );
                // Si todo sale bien el json es válido
                $scope.valid = true;

            } else {

                var error = ($scope.content.title == "") ? "Ingresa el nombre del pipeline a consultar" 
                            : "Ingresa un JSON válido (Debe contener el nodo 'resources' y tener al menos 1 nodo hijo)";

                $scope.content.error = error;

            }

        } catch(ex) {

            console.log(ex);
            $scope.content.error = "Ingresa un JSON válido";
            $scope.valid = false;

        }

    }


    /**
     * Iniciador de variables
     */
    function initVars() {
        //$scope.content.addPrincipal = true;
        $scope.content.obj = {};
        $scope.content.result = {};
        $scope.content.error = "";
        $scope.content.pipelinePrincipal = {};
        $scope.content.deps = [];
        $scope.content.params = [];
        $scope.content.resultParse = "";
        $scope.content.pipelinePrincipalParse = "";
        $scope.content.allResources = 0;
        $scope.content.activitiesNames = [];
        iRArray = [];
    }


    /**
     * Obtiene la actividad por nombre.
     * @param {object} obj - Recurso dentro de un forEach.
     * @param {string} name - Nombre del recurso.
     * @param {string} type - Tipo de recurso.
     */
    function getActivityByName(obj, name, type) {
        
        let result = {};

        let arrayFind = (obj[field] != undefined) ? obj[field] : obj;

        arrayFind.forEach((item) => {

            let plName = item.name.search(name);

            if(item.type == type && plName > 0) {
                // establecemos el pl principal
                result = setReferenceNameIR(item);

                getDeps(item);

            }
            
        });

        return result;

    }


    function GetPipelineByFolder(obj, name, type) {
        
        let result = {};

        let arrayFind = (obj[field] != undefined) ? obj[field] : obj;

        arrayFind.forEach((item) => {

            let isOnTheFolder = item.properties.folder.name.startsWith(name);

            if(item.type == type && isOnTheFolder) {
                // establecemos el pl principal
                result = setReferenceNameIR(item);

                getDeps(item);

            }
            
        });

        return result;

    }



    /**
     * Actualizar los IR Name y los ReferenceName de los LinkedService
     * @param {object} item - Recurso dentro de un forEach.
     */
    function setReferenceNameIR(item) {

        // Validamos que el recurso sea un linkedService
        if(item.type == types.linkedService) {

            if(typeof item.properties.connectVia != 'undefined') {
                // Obtenemos el nombre del IR
                let referenceName = item.properties.connectVia.referenceName.replace('-', '_');
                // Pasamos a parametro el refereceName
                item.properties.connectVia.referenceName = "[parameters('"+ referenceName +"')]";

                iRArray.push(referenceName);

            }

        // actualizamos el nombre del IR por el parametro
        } else if (item.type == types.integrationRuntimes) {

            let name = getName(item.name, "/").name;
            
            item.name = "[concat(parameters('factoryName'), '/', parameters('" 
                        + name.replace('-', '_') + "'))]";

        }

        return item;

    }


    /**
     * Obtiene la actividad por nombre.
     * @param {string} value - Texto a filtrar.
     * @param {string} index - Posición que se buscará.
     * @param {string} self - item a buscar
     */
    function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
    }


    /**
     * Obtiene las dependencias de un pipeline.
     * @param {string} pipline - Pipeline a consultar.
     */
    function getDeps(pipline) {

        // guardamos las dependencias que necesitamos en un array        
        pipline.dependsOn.forEach((item) => {
            
            let depObj = getName(item, "/");

            $scope.content.activitiesNames.push(depObj.name);

            // consultamos si ya se guardó el objeto para no duplicarlo
            counter = $scope.content.activitiesNames.filter(x => x == depObj.name).length;
            
            // Si existe al menos 1 sola vez lo guardamos, más veces no
            // Así evitamos duplicar actividades
            if(counter <= 1) {
                
                let activity = getActivityByName($scope.content.obj, depObj.name, depObj.type);

                //Actualizamos los dependsOn
                if(activity.type == types.linkedService) {
                    activity.dependsOn = activity.dependsOn.map(setDependsOnNameIntegration);
                }

                $scope.content.deps.push(activity);

            }

        });

    }


    /**
     * Obtiene el nombre de una actividad o un LinkedService a partir
     * De un split para separar el nombre de otros caracteres
     * @param {string} item - Nombre del elemento a inspeccionar.
     * @param {string} splitItem - Caracter mediante el cual se inspeccionará.
     */
    function getName(item, splitItem) {

        let name = item.split(splitItem);

        var itemName = (typeof name[2] != 'undefined') ? name[2] : name[1];

        let text = (splitItem == "/") ? itemName.split("'")[0] : name[1];
        return {
            name: text,
            type: dataFactoryTypeName + name[1]
        };

    }


    /**
     * Obtener los parametros de el ARM completo
     * @param {object} obj - Objeto completo del ARM para consultar sus params.
     */
    function getParameters(obj) {

        let objParameters = {};

        // Leemos el objeto completo y consultamos los parametros
        // que a partir de los linkedServices
        obj[field].forEach((item) => {

            if(item.type == types.linkedService) {

                // Generamos el plit a partir del "'"
                let connectionStringName = getName(
                    item.properties.typeProperties.connectionString, "'"
                );
                
                // Obtenemos el name de los connectionString
                let stringName = connectionStringName.name.split(
                    dataFactoryTypeName
                )[0];

                objParameters[stringName] = obj.parameters[stringName];

            }

        });

        // Quitamos los duplicados de IR que guardamos
        iRArray = iRArray.filter( onlyUnique );

        // Leemos el listado filtrado y agregamos a parametros
        // los parametros de IR generados
        iRArray.forEach((item) => {
            IRParameter.defaultValue = item.replace('_', '-');
            objParameters[item] = IRParameter;
        });

        // Incluimos también el parametro FactoryName
        objParameters['factoryName'] = obj.parameters.factoryName;
        
        return objParameters;

    }



    /**
     * Actualizar las dependencias de los IR
     * @param {string} item - Nombre de la dependendencia que se actualizará
     * para asignarle un nuevo nombre
     */
    function setDependsOnNameIntegration(item) {

        let name = getName(item, "/").name;
        let iRuntimeItem = item.search(IrName);
        let newName = name.replace('-', '_');

        if(iRuntimeItem > 0) {
            return "[concat(variables('factoryId'), '/" + IrName + "/', parameters('"+ newName +"'))]";
        } else {
            return item;
        }

    }


}]);