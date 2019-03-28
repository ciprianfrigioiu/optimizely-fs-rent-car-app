// App config
const environment = process.argv[2] || 'production'; // Set this to 'preproduction' to enable the debug messages
const requestPromise = require('request-promise');
const promptInput = require('prompt-input');
const optimizelySDK = require('@optimizely/optimizely-sdk');
const uuidv = require('uuid/v4'); // https://www.npmjs.com/package/uuid

var datafileUrl = 'https://cdn.optimizely.com/datafiles/4GyzsSrJkyrbLiAWUgGNbT.json';

if (environment === 'preproduction') {
	datafileUrl = 'https://cdn.optimizely.com/datafiles/VMG9BP3YrCgvaatxNTVSjX.json';
}

const options = {
	uri: datafileUrl,
	json: true
};

// Get user ID and campaign source
var userId = uuidv();
var userSources = ['campaign_classic_car_enthusiasts', 'campaign_man_and_van', 'direct'];

var userAttributes = {
	'campaign': userSources[Math.floor(Math.random() * userSources.length)]
};

if (environment === 'preproduction') {
	console.log('DEBUG: User attributes | ' + userAttributes.campaign);
}

if (environment === 'preproduction') {
	console.log('DEBUG: UUID | ' + userId);
}

if (environment === 'preproduction') {
	console.log('DEBUG: Optimizely SDK loaded');
}

// Retrieve datafile
requestPromise(options).then(function (datafile) {
	if (environment === 'preproduction') {
		console.log('DEBUG: Datafile retrieved');
	}

	// Configure logger, event handler, event dispatcher & notifications
	var defaultLogger = optimizelySDK.logging;
	var defaultLogLevel = environment === 'preproduction' ? optimizelySDK.enums.LOG_LEVEL.DEBUG : optimizelySDK.enums.LOG_LEVEL.INFO;
	var defaultErrorHandler = optimizelySDK.errorHandler;
	var defaultEventDispatcher = optimizelySDK.eventDispatcher;
	var defaultEnums = optimizelySDK.enums;

	// Display Activate notification
	function onActivate(activateObject) {
		if (environment === 'preproduction') {
			console.log('NOTIFICATION: Activate called for experiment %s', activateObject.experiment['key']);
		}
	}

	// Instantiate and setup the Optimizely client
	const optimizelyClientInstance = optimizelySDK.createInstance({
		datafile: datafile,
		errorHandler: defaultErrorHandler,
		eventDispatcher: defaultEventDispatcher,
		logger: defaultLogger.createLogger({
			logLevel: defaultLogLevel
		})
	});

	if (environment === 'preproduction') {
		console.log('DEBUG: '+ environment +' Optimizely client instantiated');
	}

	// Add an ACTIVATE notification listener
	const activateId = optimizelyClientInstance.notificationCenter.addNotificationListener(
		defaultEnums.NOTIFICATION_TYPES.ACTIVATE,
		onActivate
	);

	// Default experience
	console.log('*** Ciprian\'s Rent a Car ***');
	console.log('> Welcome to the most prestigioius car rental service in London!');

	var catalogue = new promptInput({
		message: '> Would you like to see our vehicles catalogue? [yes/no]'
	});

	catalogue.run().then(function (response) {
		if (response.toLowerCase() === 'yes') {
			var vehicles = [
				{
					'name': 'Mini',
					'price': 15
				},
				{
					'name': 'Compact',
					'price': 20
				},
				{
					'name': 'Van',
					'price': 30
				},
				{
					'name': 'Deluxe',
					'price': 50
				}
			];

			// Classic car feature
			var enabled = optimizelyClientInstance.isFeatureEnabled('classic_car', userId, userAttributes);
			var name = optimizelyClientInstance.getFeatureVariableString('classic_car', 'name', userId);
			var price = optimizelyClientInstance.getFeatureVariableInteger('classic_car', 'price', userId);
			var pickVehicle;

			if (enabled) {
				if (environment === 'preproduction') {
					console.log('DEBUG: Feature active');
				}

				vehicles.push({'name': name, 'price': price});
			}

			console.log('> Here\'s our full vehicle selection:');

			for (var i=0; i<vehicles.length; i++) {
				console.log('>> ' + vehicles[i].name + ' - £' + vehicles[i].price + '/day');
			}

			if (!enabled) {
				pickVehicle = new promptInput({
					message: '> Which vehicle would you like to rent? [mini/compact/van/deluxe/none]'
				});
			} else {
				pickVehicle = new promptInput({
					message: '> Which vehicle would you like to rent? [mini/compact/van/deluxe/classic/none]'
				});
			}

			pickVehicle.run().then(function (response) {
				if (response.toLowerCase() !== 'none') {
					var vehiclePicked = response;

					var numberOfDays = new promptInput({
						message: '> For how many days would you like to rent it? [integer]'
					});

					numberOfDays.run().then(function (response) {
						var noDays = response;

						// A/B test
						var variation;
						var forcedVariationKey; // Use "upsell_roadside_protection" for variation 1, "upsell_navigation_system" for variation 2 or leave empty to activate the experiment normally

						// Determine if the variation should be forced or not
						if (typeof forcedVariationKey !== 'undefined') {
							if (optimizelyClientInstance.setForcedVariation('extras_upsell', userId, forcedVariationKey)) {
								variation = optimizelyClientInstance.getForcedVariation('extras_upsell', userId);
							}
						} else {
							variation = optimizelyClientInstance.activate('extras_upsell', userId, userAttributes);
						}

						// Variations logic
						if (variation === 'upsell_roadside_protection') {
							// Variation 1
							if (environment === 'preproduction') {
								console.log('DEBUG: User bucketed in Variation 1');
							}

							var roadsideProtection = new promptInput({
								message: '> Would you like to add Roadside Protection for only £10? [yes/no]'
							});

							roadsideProtection.run().then(function (response) {
								var roadsideProtectionFee = 10;

								if (response.toLowerCase() === 'yes') {
									for (var j=0; j<vehicles.length; j++) {
										if (vehicles[j].name.toLowerCase() === vehiclePicked) {
											console.log('> Congratulations! You just booked your ' + vehicles[j].name + ' for ' + noDays + ' days for a total price of £' + ((vehicles[j].price * noDays) + roadsideProtectionFee) + ' (incl. Roadside Protection Extra).');
											optimizelyClientInstance.track('rented_a_car', userId, {'class': vehicles[j].name.toLowerCase()}, {'revenue': ((vehicles[j].price * noDays) + roadsideProtectionFee) * 100});
											optimizelyClientInstance.track('added_roadside_protection', userId);
										}
									}
								} else {
									for (var j=0; j<vehicles.length; j++) {
										if (vehicles[j].name.toLowerCase() === vehiclePicked) {
											console.log('> Congratulations! You just booked your ' + vehicles[j].name + ' for ' + noDays + ' days for a total price of £' + vehicles[j].price * noDays + '.');
											optimizelyClientInstance.track('rented_a_car', userId, {'class': vehicles[j].name.toLowerCase()}, {'revenue': (vehicles[j].price * noDays) * 100});
										}
									}
								}
							});
						} else if (variation === 'upsell_navigation_system') {
							// Variation 2
							if (environment === 'preproduction') {
								console.log('DEBUG: User bucketed in Variation 2');
							}

							var navigationSystem = new promptInput({
								message: '> Would you like to add our world class Navigation System for only £30? [yes/no]'
							});

							navigationSystem.run().then(function (response) {
								var navigationSystemFee = 30;

								if (response.toLowerCase() === 'yes') {
									for (var j=0; j<vehicles.length; j++) {
										if (vehicles[j].name.toLowerCase() === vehiclePicked) {
											console.log('> Congratulations! You just booked your ' + vehicles[j].name + ' for ' + noDays + ' days for a total price of £' + ((vehicles[j].price * noDays) + navigationSystemFee) + ' (incl. Navigation System Extra).');
											optimizelyClientInstance.track('rented_a_car', userId, {'class': vehicles[j].name.toLowerCase()}, {'revenue': ((vehicles[j].price * noDays) + navigationSystemFee) * 100});
											optimizelyClientInstance.track('added_navigation_system', userId);
										}
									}
								} else {
									for (var j=0; j<vehicles.length; j++) {
										if (vehicles[j].name.toLowerCase() === vehiclePicked) {
											console.log('> Congratulations! You just booked your ' + vehicles[j].name + ' for ' + noDays + ' days for a total price of £' + vehicles[j].price * noDays + '.');
											optimizelyClientInstance.track('rented_a_car', userId, {'class': vehicles[j].name.toLowerCase()}, {'revenue': (vehicles[j].price * noDays) * 100});
										}
									}
								}
							});
						} else {
							// Control
							for (var j=0; j<vehicles.length; j++) {
								if (vehicles[j].name.toLowerCase() === vehiclePicked) {
									console.log('> Congratulations! You just booked your ' + vehicles[j].name + ' for ' + noDays + ' days for a total price of £' + vehicles[j].price * noDays + '.');
									optimizelyClientInstance.track('rented_a_car', userId, {'class': vehicles[j].name.toLowerCase()}, {'revenue': (vehicles[j].price * noDays) * 100});
								}
							}
						}
					});
				} else {
					console.log('> Sad to see you go :(');
				}
			});
		} else {
			console.log('> Sad to see you go :(');
		}
	});
});